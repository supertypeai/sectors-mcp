import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export interface CompanyFinancialInfo {
  pb_mrq?: number;
  pe_ttm?: number;
  ps_ttm?: number;
  dar_mrq?: number;
  der_mrq?: number;
  roa_ttm?: number;
  roe_ttm?: number;
  market_cap?: number;
  company_name?: string;
  total_assets?: number;
  total_equity?: number;
  total_revenue?: number;
  profit_and_loss?: number;
  yearly_mcap_chg?: number;
  total_liabilities?: number;
  financials_latest_date?: string;
  [key: string]: any;
}

export async function fetchCompanyFinancial(
  env: any,
  symbol: string
): Promise<CompanyFinancialInfo> {
  const supabase = createSupabaseClient(env);

  // Query Supabase for company financial data
  const { data, error } = await supabase
    .from("idx_company_report")
    .select("self_financial_info")
    .eq("symbol", symbol)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch financial data for company: ${symbol} - ${error.message}`
    );
  }

  if (!data || !data.self_financial_info) {
    throw new Error(`No financial data found for company: ${symbol}`);
  }

  return data.self_financial_info as CompanyFinancialInfo;
}

export function registerCompanyFinancialTool(server: McpServer, env: any) {
  server.tool(
    "get-company-financial",
    `Get detailed financial information for a specific IDX company.
        
    This tool retrieves financial data which includes:
    - pb_mrq: Price to Book Ratio (Most Recent Quarter)
    - pe_ttm: Price to Earnings Ratio (Trailing Twelve Months)
    - ps_ttm: Price to Sales Ratio (Trailing Twelve Months)
    - dar_mrq: Debt to Asset Ratio (Most Recent Quarter)
    - der_mrq: Debt to Equity Ratio (Most Recent Quarter)
    - roa_ttm: Return on Assets (Trailing Twelve Months)
    - roe_ttm: Return on Equity (Trailing Twelve Months)
    - market_cap: Market Capitalization
    - company_name: Company Name
    - total_assets: Total Assets
    - total_equity: Total Equity
    - total_revenue: Total Revenue
    - profit_and_loss: Profit/Loss
    - yearly_mcap_chg: Yearly Market Cap Change
    - total_liabilities: Total Liabilities
    - financials_latest_date: Latest Financial Data Date
    
    Note: The company symbol must include the .JK suffix (e.g., "BBCA.JK")`,
    {
      symbol: z
        .string()
        .regex(/\.JK$/, "Symbol must end with .JK")
        .describe("Company symbol with .JK suffix (e.g., 'BBCA.JK')"),
    },
    async ({ symbol }) => {
      try {
        const financialData = await fetchCompanyFinancial(env, symbol);

        return {
          content: [
            {
              type: "text",
              text: `Financial Data for ${symbol}:\n\n${JSON.stringify(
                financialData,
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
              text: `Error fetching company financial data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
