import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export interface SingaporeCompanyData {
  symbol: string;
  name: string;
  sector?: string;
  sub_sector?: string;
  market_cap?: number;
  volume?: number;
  earnings?: number;
  revenue?: number;
  eps?: number;
  pe?: number;
  pb?: number;
  ps?: number;
  pcf?: number;
  employee_num?: number;
  beta?: number;
  dividend_ttm?: number;
  dividend_growth_rate?: number;
  forward_dividend?: number;
  forward_dividend_yield?: number;
  payout_ratio?: number;
  dividend_yield_5y_avg?: number;
  gross_margin?: number;
  operating_margin?: number;
  net_profit_margin?: number;
  one_year_sales_growth?: number;
  one_year_eps_growth?: number;
  current_ratio?: number;
  quick_ratio?: number;
  debt_to_equity?: number;
  change_1d?: number;
  change_7d?: number;
  change_1m?: number;
  change_1y?: number;
  change_3y?: number;
  change_ytd?: number;
  all_time_price?: any;
  close?: any;
  historical_dividends?: any;
  historical_financials?: any;
  [key: string]: any;
}

export async function fetchSingaporeCompaniesReport(
  env: any,
  columns: string[],
  symbols: string[]
): Promise<SingaporeCompanyData[]> {
  const supabase = createSupabaseClient(env);

  // Always include these required columns
  const requiredColumns = ["symbol", "name"];

  // Combine user-requested columns with required columns
  const allColumns = [...requiredColumns, ...(columns || [])];

  // Remove duplicates using Set
  const uniqueColumns = [...new Set(allColumns)];

  // Query Supabase for company data
  const { data, error } = await supabase
    .from("sgx_company_report")
    .select(uniqueColumns.join(","))
    .in("symbol", symbols)
    .limit(10);

  if (error) {
    throw new Error(
      `Failed to fetch Singapore company reports for symbols: ${symbols.join(
        ", "
      )} - ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as unknown as SingaporeCompanyData[];
}

export function registerSingaporeCompaniesReportTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "get-singapore-companies-report",
    `Get Singapore (SGX) companies report by columns and symbols.
      
    DO NOT CALL COLUMNS WITH JSON VALUES UNLESS YOU REALLY NEED IT OR USER SPECIFIED IT!
    Available columns from sgx_company_report:
    - name: Full company name (string)
    - symbol: Stock ticker symbol (string)
    - sector: Sector classification (string)
    - sub_sector: Sub-sector classification (string)
    - market_cap: Market capitalization (number)
    - volume: Trading volume (number)
    - earnings: Company earnings (number)
    - revenue: Company revenue (number)
    - eps: Earnings per share (number)
    - pe: Price-to-earnings ratio (number)
    - pb: Price-to-book ratio (number)
    - ps: Price-to-sales ratio (number)
    - pcf: Price-to-cash-flow ratio (number)
    - employee_num: Number of employees (number)
    - beta: Stock beta (number)
    - dividend_ttm: Trailing twelve months dividend (number)
    - dividend_growth_rate: Dividend growth rate (number)
    - forward_dividend: Forward dividend (number)
    - forward_dividend_yield: Forward dividend yield (number)
    - payout_ratio: Dividend payout ratio (number)
    - dividend_yield_5y_avg: 5-year average dividend yield (number)
    - gross_margin: Gross profit margin (number)
    - operating_margin: Operating margin (number)
    - net_profit_margin: Net profit margin (number)
    - one_year_sales_growth: 1-year sales growth (number)
    - one_year_eps_growth: 1-year EPS growth (number)
    - current_ratio: Current ratio (number)
    - quick_ratio: Quick ratio (number)
    - debt_to_equity: Debt-to-equity ratio (number)
    - change_1d: 1-day price change (number)
    - change_7d: 7-day price change (number)
    - change_1m: 1-month price change (number)
    - change_1y: 1-year price change (number)
    - change_3y: 3-year price change (number)
    - change_ytd: Year-to-date price change (number)
    - all_time_price: Historical price data (JSON)
    - close: Latest closing prices (JSON)
    - historical_dividends: Historical dividend data (JSON)
    - historical_financials: Historical financials data (JSON)`,
    {
      columns: z
        .array(z.string())
        .describe(
          "Array of column names to retrieve from the Singapore company report"
        ),
      symbols: z
        .array(z.string())
        .describe("Array of Singapore company symbols to query"),
    },
    async ({ columns, symbols }) => {
      try {
        const companies = await fetchSingaporeCompaniesReport(
          env,
          columns,
          symbols
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(companies, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching Singapore company reports: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
