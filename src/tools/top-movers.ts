import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

interface TopMover {
  name: string;
  symbol: string;
  price_change: number;
  last_close_price: number;
  latest_close_date: string;
}

interface TopMoversPeriodData {
  '1d'?: TopMover[];
  '7d'?: TopMover[];
  '14d'?: TopMover[];
  '30d'?: TopMover[];
  '365d'?: TopMover[];
}

interface TopCompanyMoversResponse {
  top_gainers?: TopMoversPeriodData;
  top_losers?: TopMoversPeriodData;
}

export async function fetchTopCompanyMovers(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    classifications?: string;
    n_stock?: number;
    min_mcap_billion?: number;
    periods?: string;
    sub_sector?: string;
  } = {}
): Promise<TopCompanyMoversResponse> {
  const searchParams = new URLSearchParams();
  
  if (params.classifications && params.classifications !== 'all') {
    searchParams.append('classifications', params.classifications);
  }
  
  if (params.n_stock) {
    searchParams.append('n_stock', params.n_stock.toString());
  }
  
  if (params.min_mcap_billion) {
    searchParams.append('min_mcap_billion', params.min_mcap_billion.toString());
  }
  
  if (params.periods && params.periods !== 'all') {
    searchParams.append('periods', params.periods);
  }
  
  if (params.sub_sector && params.sub_sector !== 'all') {
    searchParams.append('sub_sector', params.sub_sector);
  }

  const url = `${baseUrl}/companies/top-changes/?${searchParams.toString()}`;
  const response = await fetch(url, {
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<TopCompanyMoversResponse>(response);
}

export function registerTopCompanyMoversTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-company-movers",
    "Fetches top company movers based on price changes",
    {
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe("Comma-separated list of classifications (top_gainers, top_losers)"),
      n_stock: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .default(5)
        .describe("Number of stocks to return (1-10)"),
      min_mcap_billion: z
        .number()
        .int()
        .min(0)
        .optional()
        .default(5000)
        .describe("Minimum market cap in billion IDR"),
      periods: z
        .string()
        .optional()
        .default("all")
        .describe("Comma-separated list of periods (1d,7d,14d,30d,365d)"),
      sub_sector: z
        .string()
        .optional()
        .default("all")
        .describe("Subsector to filter by (in kebab-case)"),
    },
    async ({
      classifications = "all",
      n_stock = 5,
      min_mcap_billion = 5000,
      periods = "all",
      sub_sector = "all",
    }) => {
      try {
        const result = await fetchTopCompanyMovers(baseUrl, apiKey, {
          classifications,
          n_stock,
          min_mcap_billion,
          periods,
          sub_sector,
        });
        
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
            ? error 
            : 'An unknown error occurred';
            
        return {
          content: [{
            type: "text" as const,
            text: errorMessage
          }],
          isError: true
        };
      }
    }
  );
}
