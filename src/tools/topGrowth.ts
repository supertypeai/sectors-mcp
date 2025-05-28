import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface GrowthCompany {
  symbol: string;
  company_name: string;
  yoy_quarter_earnings_growth?: number;
  yoy_quarter_revenue_growth?: number;
}

export interface TopGrowthResponse {
  top_earnings_growth_gainers: GrowthCompany[];
  top_earnings_growth_losers: GrowthCompany[];
  top_revenue_growth_gainers: GrowthCompany[];
  top_revenue_growth_losers: GrowthCompany[];
}

export async function fetchTopGrowth(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    classifications?: string;
    n_stock?: number;
    min_mcap_billion?: number;
    sub_sector?: string;
  } = {}
): Promise<TopGrowthResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/companies/top-growth/`);
  const { classifications, n_stock, min_mcap_billion, sub_sector } = params;

  if (classifications) url.searchParams.append("classifications", classifications);
  if (n_stock) url.searchParams.append("n_stock", n_stock.toString());
  if (min_mcap_billion) url.searchParams.append("min_mcap_billion", min_mcap_billion.toString());
  if (sub_sector && sub_sector !== "all") url.searchParams.append("sub_sector", sub_sector);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<TopGrowthResponse>(response);
}

export function registerTopGrowthTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-growth-companies",
    "Fetch top companies by growth metrics (earnings/revenue growth gainers/losers)",
    {
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe("Comma-separated list of classifications (top_earnings_growth_gainers, top_earnings_growth_losers, top_revenue_growth_gainers, top_revenue_growth_losers)"),
      n_stock: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Number of companies to return per classification (1-10)"),
      min_mcap_billion: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(5000)
        .describe("Minimum market cap in billion IDR"),
      sub_sector: z
        .string()
        .optional()
        .default("all")
        .describe("Filter by subsector (e.g., 'banks', 'insurance')"),
    },
    async ({ classifications, n_stock, min_mcap_billion, sub_sector }) => {
      try {
        const result = await fetchTopGrowth(baseUrl, apiKey, {
          classifications,
          n_stock,
          min_mcap_billion,
          sub_sector,
        });

        return {
          content: [
            {
              type: "text",
              text: `Top Growth Companies (${sub_sector !== "all" ? `Subsector: ${sub_sector}` : 'All Subsectors'})\n              \n${formatGrowthResults(result)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

function formatGrowthResults(data: TopGrowthResponse): string {
  let output = "";

  const formatCompanyList = (companies: GrowthCompany[], metric: keyof Omit<GrowthCompany, 'symbol' | 'company_name'>) => {
    return companies
      .map((company) => {
        const value = company[metric];
        return `• ${company.symbol} (${company.company_name}): ${value !== undefined ? value : 'N/A'}%`;
      })
      .join("\n");
  };

  if (data.top_earnings_growth_gainers?.length > 0) {
    output += `\n📈 Top Earnings Growth Gainers:\n${formatCompanyList(
      data.top_earnings_growth_gainers,
      "yoy_quarter_earnings_growth"
    )}\n`;
  }

  if (data.top_earnings_growth_losers?.length > 0) {
    output += `\n📉 Top Earnings Growth Losers:\n${formatCompanyList(
      data.top_earnings_growth_losers,
      "yoy_quarter_earnings_growth"
    )}\n`;
  }

  if (data.top_revenue_growth_gainers?.length > 0) {
    output += `\n📈 Top Revenue Growth Gainers:\n${formatCompanyList(
      data.top_revenue_growth_gainers,
      "yoy_quarter_revenue_growth"
    )}\n`;
  }

  if (data.top_revenue_growth_losers?.length > 0) {
    output += `\n📉 Top Revenue Growth Losers:\n${formatCompanyList(
      data.top_revenue_growth_losers,
      "yoy_quarter_revenue_growth"
    )}\n`;
  }

  return output || "No growth data available for the selected criteria.";
}
