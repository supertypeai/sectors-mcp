import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse, formatNumber } from "../utils/api.js";

export interface SGXCompanyReport {
  symbol: string;
  name: string;
  overview: {
    market_cap: number;
    volume: number;
    employee_num: number;
    sector: string;
    sub_sector: string;
    change_1d: number;
    change_7d: number;
    change_1m: number;
    change_1y: number;
    change_3y: number;
    change_ytd: number;
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
  };
  valuation: {
    pe: number;
    ps: number;
    pcf: number;
    pb: number;
  };
  financials: {
    historical_earnings: {
      ttm: number;
      [key: string]: number | null;
    };
    historical_revenue: {
      ttm: number;
      [key: string]: number | null;
    };
    eps: number;
    gross_margin: number;
    operating_margin: number;
    net_profit_margin: number;
    one_year_eps_growth: number;
    one_year_sales_growth: number;
    quick_ratio: number | null;
    current_ratio: number | null;
    debt_to_equity: number | null;
  };
  dividend: {
    dividend_yield_5y_avg: number;
    dividend_growth_rate: number;
    payout_ratio: number;
    forward_dividend: number;
    forward_dividend_yield: number;
    dividend_ttm: number;
    historical_dividends: Array<{
      year: number;
      breakdown: Array<{
        date: string;
        total: number;
        yield: number;
      }>;
      total_yield: number;
      total_dividend: number;
    }>;
  };
}

export async function fetchSGXCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  ticker: string
): Promise<SGXCompanyReport> {
  const url = new URL(`/sgx/company/report/${ticker}`, baseUrl);
  const response = await fetch(url.toString(), {
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<SGXCompanyReport>(response);
}

export function registerSGXCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-company-report",
    "Fetch a comprehensive report for a given SGX-listed company ticker, including overview, valuation, financials, and dividend information.",
    {
      ticker: z.string().describe("The ticker symbol of the company (e.g., 'D05', 'U11', 'D05.SI')")
    },
    async (args) => {
      const { ticker } = args;
      try {
        // Remove .SI suffix if present (API handles case insensitivity)
        const cleanTicker = ticker.replace(/\.si$/i, '');
        const report = await fetchSGXCompanyReport(baseUrl, apiKey, cleanTicker);
        
        // Format the response for better readability
        const marketCap = parseFloat(formatNumber(report.overview.market_cap, 2));
        const peRatio = report.valuation.pe.toFixed(2);
        const divYield = (report.dividend.forward_dividend_yield * 100).toFixed(2);
        const eps = report.financials.eps.toFixed(2);
        const pbRatio = report.valuation.pb.toFixed(2);

        const reportText = `SGX Company Report for ${report.name} (${report.symbol}):\n` +
          `Sector: ${report.overview.sector}\n` +
          `Subsector: ${report.overview.sub_sector}\n` +
          `Market Cap: $${marketCap.toLocaleString()}\n` +
          `PE Ratio: ${peRatio} | PB Ratio: ${pbRatio}\n` +
          `EPS: ${eps} | Div Yield: ${divYield}%`;

        return {
          content: [
            {
              type: "text",
              text: reportText
            }
          ]
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching SGX company report for ${ticker}: ${error.message}`
            }
          ]
        };
      }

    }
  );
}
