import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface SubsectorReport {
  sector: string;
  sub_sector: string;
  statistics: {
    total_companies: number;
    filtered_median_pe: number;
    filtered_weighted_avg_pe: number;
    min_company_pe: number;
    max_company_pe: number;
  };
  market_cap: {
    total_market_cap: number;
    avg_market_cap: number;
    quarterly_market_cap: {
      prev_ttm_mcap: Record<string, number>;
      current_ttm_mcap: Record<string, number>;
      current_ttm_mcap_pavg: Record<string, number>;
    };
    mcap_summary: {
      mcap_change: {
        "1w": number;
        "1y": number;
        ytd: number;
      };
      monthly_performance: Record<string, number>;
      performance_quantile: number;
    };
  };
  stability: {
    weighted_max_drawdown: number;
    weighted_rsd_close: number;
  };
  valuation: {
    historical_valuation: Array<{
      pb: number;
      pe: number;
      ps: number;
      pcf: number;
      year: number;
      pb_rank?: number;
      pe_rank?: number;
      ps_rank?: number;
      pcf_rank?: number;
    }>;
  };
  growth: {
    weighted_avg_growth_data: Array<{
      year: number;
      avg_annual_earning_growth: number | null;
      avg_annual_revenue_growth: number | null;
    }>;
    growth_forecasts: Array<{
      base_year: number;
      eps_growth: number;
      estimate_year: number;
      revenue_growth: number;
    }>;
  };
  companies: {
    top_companies: {
      top_mcap: Array<{
        symbol: string;
        market_cap: number;
      }>;
      top_growth: Array<{
        symbol: string;
        revenue_growth: number;
      }>;
      top_profit: Array<{
        symbol: string;
        profit_ttm: number;
      }>;
      top_revenue: Array<{
        symbol: string;
        revenue_ttm: number;
      }>;
    };
    top_change_companies: Array<{
      pe: number;
      "1yr": number;
      "1mth": number;
      name: string;
      symbol: string;
      last_close: number;
    }>;
  };
  [key: string]: any;
}

export async function fetchSubsectorReport(
  baseUrl: string,
  apiKey: string | undefined,
  subSector: string,
  sections: string = "all"
): Promise<SubsectorReport> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/subsector/report/${encodeURIComponent(subSector)}/`);
  
  if (sections !== "all") {
    url.searchParams.append("sections", sections);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<SubsectorReport>(response);
}

export function registerSubsectorReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-subsector-report",
    "Fetch a comprehensive report for a specific subsector from the Sectors API",
    {
      subSector: z.string().describe("The subsector to fetch the report for"),
      sections: z.string().optional().default("all").describe(
        "Comma-separated sections to include (default: all). " +
        "Available sections: statistics, market_cap, stability, valuation, growth, companies"
      )
    },
    async ({ subSector, sections = "all" }) => {
      try {
        const report = await fetchSubsectorReport(baseUrl, apiKey, subSector, sections);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/subsector/report/${encodeURIComponent(subSector)}/${sections !== "all" ? `?sections=${sections}` : ''}\n\n${JSON.stringify(report, null, 2)}`
          }]
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
