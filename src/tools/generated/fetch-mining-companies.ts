import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCompanies(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  commodity_type?: "Aluminium" | "Coal" | "Copper" | "Gold" | "Nickel" | "Silver" | "Zinc and Lead";
  limit?: number;
  offset?: number;
  keyword?: string;
  company_type?: "Consultant" | "Contractor" | "Holding" | "Manufacturer" | "Mine Owner" | "Trader";
  has_financials?: boolean;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/companies/`);
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }
  if (params.keyword !== undefined) {
    url.searchParams.append("keyword", String(params.keyword));
  }
  if (params.company_type !== undefined) {
    url.searchParams.append("company_type", String(params.company_type));
  }
  if (params.has_financials !== undefined) {
    url.searchParams.append("has_financials", String(params.has_financials));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-companies",
    {
      description: "Searches for Indonesian mining companies by name, symbol, slug, or key operation. Supports filtering by commodity type and company type.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      commodity_type: z.enum(["Aluminium", "Coal", "Copper", "Gold", "Nickel", "Silver", "Zinc and Lead"])
        .describe("Filter by commodity. E.g. `Coal`, `Nickel`, `Gold`.").optional(),
      limit: z.number()
        .describe("Results per page. Default 20.").optional(),
      offset: z.number()
        .describe("Items to skip for pagination.").optional(),
      keyword: z.string()
        .describe("Search across company name, IDX symbol, slug, and key operations (case-insensitive).").optional(),
      company_type: z.enum(["Consultant", "Contractor", "Holding", "Manufacturer", "Mine Owner", "Trader"])
        .describe("Filter by company type.").optional(),
      has_financials: z.boolean()
        .describe("If `true`, return only companies with financial data available.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningCompanies(baseUrl, apiKey, params);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
