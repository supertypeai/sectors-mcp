import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

export interface YearlyFinancialData {
  symbol: string;
  year: number;
  revenue: number | null;
  earnings: number | null;
}

export async function fetchSingaporeCompanyHistoricalFinancial(
  env: any,
  symbol: string
): Promise<YearlyFinancialData[]> {
  const supabase = createSupabaseClient(env);

  const { data, error } = await supabase
    .from("sgx_company_report")
    .select(
      `
      symbol,
      revenue,
      earnings,
      historical_financials
    `
    )
    .eq("symbol", symbol)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch historical financial data for Singapore company: ${symbol} - ${error.message}`
    );
  }

  if (
    !data?.historical_financials &&
    data.revenue == null &&
    data.earnings == null
  ) {
    throw new Error(
      `No historical financial data found for Singapore company: ${symbol}`
    );
  }

  const historical_financials = data.historical_financials as
    | Array<{ year: number | string; revenue?: number; earnings?: number }>
    | undefined;

  const historicalEarnings: Record<string, number> = {};
  const historicalRevenue: Record<string, number> = {};

  if (Array.isArray(historical_financials)) {
    historical_financials.forEach((row) => {
      if (row.year !== undefined) {
        const yearKey = String(row.year);
        if (row.earnings !== undefined) {
          historicalEarnings[yearKey] = row.earnings;
        }
        if (row.revenue !== undefined) {
          historicalRevenue[yearKey] = row.revenue;
        }
      }
    });
  }

  if (data.earnings !== undefined && data.earnings !== null) {
    historicalEarnings["ttm"] = data.earnings;
  }
  if (data.revenue !== undefined && data.revenue !== null) {
    historicalRevenue["ttm"] = data.revenue;
  }

  // Combine earnings and revenue data by year
  const years = new Set([
    ...Object.keys(historicalEarnings),
    ...Object.keys(historicalRevenue),
  ]);

  const yearlyData: YearlyFinancialData[] = Array.from(years).map((year) => ({
    symbol,
    year: year === "ttm" ? 9999 : parseInt(year),
    revenue: historicalRevenue?.[year] ?? null,
    earnings: historicalEarnings?.[year] ?? null,
  }));

  // Sort by year in descending order (most recent first, ttm at the top)
  yearlyData.sort((a, b) => b.year - a.year);

  return yearlyData;
}

export function registerSingaporeCompanyHistoricalFinancialTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "get-singapore-company-historical-financial",
    `Get historical financial information for a specific SGX (Singapore Exchange) company.
        
    This tool retrieves historical financial data which includes:
    - revenue: Historical Revenue
    - earnings: Historical Earnings/Net Profit
    
    Data is provided on a yearly basis with historical records.
    TTM (Trailing Twelve Months) data is also included when available.`,
    {
      symbol: z
        .string()
        .describe("Singapore company symbol (e.g., 'D05', 'O39')"),
    },
    async ({ symbol }) => {
      try {
        const financialData = await fetchSingaporeCompanyHistoricalFinancial(
          env,
          symbol
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(financialData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching Singapore company historical financial data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
