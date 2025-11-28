import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export type HistoricalEps = Record<
  string,
  { eps?: number; eps_growth?: number }
>;

export interface CompanyData {
  symbol: string;
  company_name: string;
  address?: string;
  alias?: string[];
  all_time_price?: any;
  analyst_rating_breakdown?: any;
  annual_yield?: any;
  cash_payout_ratio?: number;
  company_growth_forecasts?: any;
  company_value_forecasts?: any;
  daily_close_change?: number;
  dividend_ttm?: number;
  dividend_yield_avg?: any;
  email?: string;
  employee_num?: number;
  employee_num_rank?: number;
  historical_eps?: HistoricalEps | null;
  esg_score?: number;
  executives_shareholdings?: any;
  forward_pe?: number;
  historical_dividends?: any;
  historical_financial_ratio?: any;
  historical_financials?: any;
  historical_financials_quarterly?: any;
  historical_valuation?: any;
  industry?: string;
  intrinsic_value?: number;
  key_executives?: any;
  last_close_price?: number;
  market_cap?: number;
  market_cap_rank?: number;
  sector?: string;
  sub_sector?: string;
  yield_ttm?: number;
  yoy_quarter_earnings_growth?: number;
  yoy_quarter_revenue_growth?: number;
  eps?: number | null;
  [key: string]: any;
}

export const extractLatestEps = (hist: HistoricalEps | null) => {
  if (!hist || typeof hist !== "object") return null;
  const years = Object.keys(hist)
    .filter(Boolean)
    .map((y) => Number(y))
    .filter((n) => !Number.isNaN(n))
    .sort((a, b) => b - a);
  if (years.length === 0) return null;
  const latestKey = String(years[0]);
  const val = hist[latestKey]?.eps;
  return typeof val === "number" ? val : null;
};

export async function fetchCompaniesReport(
  env: any,
  columns: string[],
  symbols: string[]
): Promise<CompanyData[]> {
  const supabase = createSupabaseClient(env);

  // Always include these required columns
  const requiredColumns = ["symbol", "company_name"];

  const wantsEpsAlias = (columns || []).includes("eps");
  const requestedColumns = (columns || []).filter((c) => c !== "eps");
  if (wantsEpsAlias && !requestedColumns.includes("historical_eps")) {
    requestedColumns.push("historical_eps");
  }

  // Combine user-requested columns with required columns
  const allColumns = [...requiredColumns, ...requestedColumns];

  // Remove duplicates using Set
  const uniqueColumns = [...new Set(allColumns)];

  // Query Supabase for company data
  const { data, error } = await supabase
    .from("idx_company_report")
    .select(uniqueColumns.join(","))
    .in("symbol", symbols)
    .limit(10);

  if (error) {
    throw new Error(
      `Failed to fetch company reports for symbols: ${symbols.join(", ")} - ${
        error.message
      }`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  // synthesize eps from historical_eps when requested
  let finalData = (data as unknown as CompanyData[]) || [];
  if (wantsEpsAlias) {
    finalData = finalData.map((row) => ({
      ...row,
      eps: extractLatestEps(row.historical_eps ?? null),
    }));
  }

  return finalData;
}

export function registerCompaniesReportTool(server: McpServer, env: any) {
  server.tool(
    "get-companies-report",
    `Get companies report by columns and symbols.
    ALWAYS USE THIS TOOLS FOR REPORT RELATED QUESTION! IF ASKED FOR FINANCIALS USE HISTORICAL FINANCIALS TOOLS INSTEAD
      
    DO NOT CALL COLUMNS WITH JSON VALUES UNLESS YOU REALLY NEED IT OR USER SPECIFIED IT!
    Available columns from idx_company_report:
    - address: Company address (string)
    - alias: Alternative names/tickers (string[])
    - all_time_price: Historical price data (JSON)
    - analyst_rating_breakdown: Analyst ratings (JSON)
    - annual_yield: Annual dividend yield data (JSON)
    - cash_payout_ratio: Cash payout ratio (number)
    - company_growth_forecasts: Growth forecasts (JSON)
    - company_name: Full company name (string)
    - company_value_forecasts: Valuation forecasts (JSON)
    - daily_close_change: Daily price change (number)
    - dividend_ttm: Trailing twelve months dividend (number)
    - dividend_yield_avg: Average dividend yield (JSON)
    - email: Company contact email (string)
    - employee_num: Number of employees (number)
    - employee_num_rank: Employee count ranking (number)
    - historical_eps: Historical EPS data (JSON)
    - esg_score: Environmental, Social, Governance score (number)
    - executives_shareholdings: Executive ownership data (JSON)
    - forward_pe: Forward price-to-earnings ratio (number)
    - historical_dividends: Historical dividend data (JSON)
    - historical_financial_ratio: Historical financial ratios (JSON)
    - historical_financials: Historical financial data (JSON)
    - historical_financials_quarterly: Quarterly financial data (JSON)
    - historical_valuation: Historical valuation metrics (JSON)
    - industry: Industry classification (string)
    - intrinsic_value: Calculated intrinsic value (number)
    - key_executives: Key company executives (JSON)
    - last_close_price: Latest closing price (number)
    - market_cap: Market capitalization (number)
    - market_cap_rank: Market cap ranking (number)
    - sector: Sector classification (string)
    - sub_sector: Sub-sector classification (string)
    - symbol: Stock ticker symbol (string)
    - yield_ttm: Trailing twelve months yield (number)
    - yoy_quarter_earnings_growth: Year-over-year quarterly earnings growth (number)
    - yoy_quarter_revenue_growth: Year-over-year quarterly revenue growth (number)`,
    {
      columns: z
        .array(z.string())
        .describe("Array of column names to retrieve from the company report"),
      symbols: z.array(z.string()).describe("Array of company symbols to query"),
    },
    async ({ columns, symbols }) => {
      try {
        const companies = await fetchCompaniesReport(env, columns, symbols);

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
              text: `Error fetching company reports: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
