import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface CompanyReport {
  symbol: string;
  company_name: string;
  overview: {
    listing_board: string;
    industry: string;
    sub_industry: string;
    sector: string;
    sub_sector: string;
    market_cap: number;
    market_cap_rank: number;
    address: string;
    employee_num: number;
    listing_date: string;
    website: string;
    phone: string;
    email: string;
    last_close_price: number;
    latest_close_date: string;
    daily_close_change: number;
    all_time_price: {
      ytd_low: { date: string; price: number };
      '52_w_low': { date: string; price: number };
      '90_d_low': { date: string; price: number };
      ytd_high: { date: string; price: number };
      '52_w_high': { date: string; price: number };
      '90_d_high': { date: string; price: number };
      all_time_low: { date: string; price: number };
      all_time_high: { date: string; price: number };
    };
    esg_score: number;
  };
  // Add other interfaces as needed based on the full response structure
  [key: string]: any;
}

export async function fetchCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  ticker: string
): Promise<CompanyReport> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/company/report/${ticker}/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<CompanyReport>(response);
}

export function registerCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-company-report",
    "Fetch detailed company report including overview, financials, and other key metrics",
    {
      input: z.object({
        ticker: z.string().describe("Company ticker symbol"),
      }),
      output: z.any(), // Using any for now due to complex response structure
    },
    async (args: { input: { ticker: string } }, extra: any) => {
      try {
        const report = await fetchCompanyReport(baseUrl, apiKey, args.input.ticker);
        return {
          content: [{
            type: "text",
            text: JSON.stringify(report, null, 2)
          }],
          _meta: {
            type: "company_report",
            symbol: report.symbol,
            companyName: report.company_name
          }
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching company report: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      }
    }
  );
}
