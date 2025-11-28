import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export interface IPOCompany {
  symbol: string;
  company_name: string;
  sector: string;
  sub_sector: string;
  sub_industry: string;
  listing_date: string;
  market_cap: number;
  last_close_price: number;
  eps?: number;
  [key: string]: any;
}

export async function fetchIPOCompanies(
  env: any,
  startDate?: string,
  endDate?: string,
  sector?: string,
  subSector?: string,
  subIndustry?: string
): Promise<IPOCompany[]> {
  const supabase = createSupabaseClient(env);

  // Always include these required columns
  const requiredColumns = [
    "symbol",
    "company_name",
    "sector",
    "sub_sector",
    "sub_industry",
    "listing_date",
    "market_cap",
    "last_close_price",
  ];

  let query = supabase
    .from("idx_company_report")
    .select(requiredColumns.join(","))
    .not("listing_date", "is", null)
    .gte("listing_date", startDate)
    .lte("listing_date", endDate);

  // Add optional filters
  if (sector) {
    query = query.eq("sector", sector);
  }
  if (subSector) {
    query = query.eq("sub_sector", subSector);
  }
  if (subIndustry) {
    query = query.eq("sub_industry", subIndustry);
  }

  // Complete the query with ordering
  const { data, error } = await query.order("listing_date", {
    ascending: false,
  });

  if (error) {
    throw new Error(`Failed to fetch IPO companies: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as unknown as IPOCompany[];
}

export function registerIPOCompaniesTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "fetch-ipo-companies",
    "Fetch recently listed IPO companies. By default, fetches companies listed in the last 30 days. You can filter by sector, subsector, and sub-industry, as well as specify a custom date range.",
    {
      startDate: z
        .string()
        .optional()
        .default(() => {
          const date = new Date();
          date.setDate(date.getDate() - 30);
          return date.toISOString().split("T")[0];
        })
        .describe("Start date in YYYY-MM-DD format. Defaults to 30 days ago."),
      endDate: z
        .string()
        .optional()
        .default(() => new Date().toISOString().split("T")[0])
        .describe("End date in YYYY-MM-DD format. Defaults to today."),
      sector: z.string().optional().describe("Filter by sector"),
      subSector: z.string().optional().describe("Filter by sub-sector"),
      subIndustry: z.string().optional().describe("Filter by sub-industry"),
    },
    async ({ startDate, endDate, sector, subSector, subIndustry }) => {
      try {
        const companies = await fetchIPOCompanies(
          env,
          startDate,
          endDate,
          sector,
          subSector,
          subIndustry
        );

        return {
          content: [
            {
              type: "text",
              text: `IPO Companies (${startDate} to ${endDate}):\n\n${JSON.stringify(
                companies,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching IPO companies: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}