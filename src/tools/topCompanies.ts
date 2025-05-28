import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

interface CompanyMetric {
  symbol: string;
  company_name: string;
  [key: string]: unknown;
}

interface TopCompaniesResponse {
  dividend_yield?: Array<CompanyMetric & { dividend_yield: number }>;
  total_dividend?: Array<CompanyMetric & { total_dividend: number }>;
  revenue?: Array<CompanyMetric & { revenue: number }>;
  earnings?: Array<CompanyMetric & { earnings: number }>;
  market_cap?: Array<CompanyMetric & { market_cap: number }>;
  pb?: Array<CompanyMetric & { pb: number }>;
  pe?: Array<CompanyMetric & { pe: number }>;
  ps?: Array<CompanyMetric & { ps: number }>;
}

export async function fetchTopCompanies(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    classifications?: string;
    filters?: string;
    logic?: 'and' | 'or';
    n_stock?: number;
    min_mcap_billion?: number;
    sub_sector?: string;
    year?: number;
  } = {}
): Promise<TopCompaniesResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/companies/top/`);
  const { 
    classifications, 
    filters, 
    logic, 
    n_stock, 
    min_mcap_billion, 
    sub_sector, 
    year 
  } = params;

  if (classifications && classifications !== 'all') url.searchParams.append('classifications', classifications);
  if (filters) url.searchParams.append('filters', filters);
  if (logic) url.searchParams.append('logic', logic);
  if (n_stock) url.searchParams.append('n_stock', n_stock.toString());
  if (min_mcap_billion !== undefined) url.searchParams.append('min_mcap_billion', min_mcap_billion.toString());
  if (sub_sector && sub_sector !== 'all') url.searchParams.append('sub_sector', sub_sector);
  if (year) url.searchParams.append('year', year.toString());

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<TopCompaniesResponse>(response);
}

export function registerTopCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-companies",
    "Fetches top companies based on various financial metrics",
    {
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe("Comma-separated list of classifications (dividend_yield, total_dividend, revenue, earnings, market_cap, pb, pe, ps)"),
      filters: z
        .string()
        .optional()
        .describe('Comma-separated list of filter conditions (e.g., "pe>20,revenue>1000")'),
      logic: z
        .enum(['and', 'or'])
        .optional()
        .default('and')
        .describe('Logical operator to combine multiple filters (and/or)'),
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
        .min(0)
        .optional()
        .default(5000)
        .describe("Minimum market cap in billion IDR"),
      sub_sector: z
        .string()
        .optional()
        .default("all")
        .describe("Sub-sector in kebab-case (e.g., banks, financing-service)"),
      year: z
        .number()
        .int()
        .optional()
        .describe("Year for the data (defaults to current year)"),
    },
    async ({
      classifications = "all",
      filters,
      logic = "and",
      n_stock = 5,
      min_mcap_billion = 5000,
      sub_sector = "all",
      year,
    }) => {
      try {
        const result = await fetchTopCompanies(baseUrl, apiKey, {
          classifications,
          filters,
          logic,
          n_stock,
          min_mcap_billion,
          sub_sector,
          year,
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
