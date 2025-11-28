import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient";

export interface YearlyFinancialData {
  symbol: string;
  tax: number;
  ebit: number;
  year: number;
  ebitda: number;
  revenue: number;
  earnings: number;
  total_debt: number;
  total_assets: number;
  total_equity: number;
  operating_pnl: number;
}

export async function fetchHistoricalFinancialData(symbol: string, env: any): Promise<YearlyFinancialData[]> {
  const supabase = createSupabaseClient(env);
  const { data, error } = await supabase
    .from("idx_company_report")
    .select("historical_financials")
    .eq("symbol", symbol)
    .single();

  if (error) {
    throw new Error(`Failed to fetch historical financial data for company: ${symbol}. Error: ${error.message}`);
  }

  if (!data?.historical_financials || !Array.isArray(data.historical_financials)) {
    throw new Error(`No historical financial data found for company: ${symbol}`);
  }

  // First cast to unknown, then to YearlyFinancialData[]
  const typedData = data.historical_financials as unknown as YearlyFinancialData[];

  // Filter only the required fields from each year's data
  const filteredData = typedData.map((yearData) => ({
    symbol: symbol,
    year: yearData.year,
    tax: yearData.tax,
    ebit: yearData.ebit,
    ebitda: yearData.ebitda,
    revenue: yearData.revenue,
    earnings: yearData.earnings,
    total_debt: yearData.total_debt,
    total_assets: yearData.total_assets,
    total_equity: yearData.total_equity,
    operating_pnl: yearData.operating_pnl,
  }));

  return filteredData;
}

export function registerHistoricalFinancialTool(server: McpServer, env: any) {
  server.tool(
    "get-companies-historical-financial",
    "Get historical financial information for a specific IDX company. This tool retrieves historical financial data which includes tax, ebit, ebitda, revenue, earnings, total_debt, total_assets, total_equity, operating_pnl. Data is provided on a yearly basis with historical records. Note: The company symbol must include the .JK suffix (e.g., 'BBCA.JK')",
    {
      symbol: z.string().regex(/\.JK$/, "Symbol must end with .JK"),
    },
    async (args: { symbol: string }) => {
      try {
        const data = await fetchHistoricalFinancialData(args.symbol, env);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching historical financial data: ${error instanceof Error ? error.message : String(error)
                }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
