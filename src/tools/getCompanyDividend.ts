import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

interface DividendBreakdown {
  date: string;
  total: number;
  yield: number;
}

interface YearlyDividend {
  year: number;
  breakdown: DividendBreakdown[];
  total_yield: number;
  total_dividend: number;
}

export async function fetchCompanyDividend(
  env: any,
  symbol: string,
  year: number
): Promise<YearlyDividend> {
  const supabase = createSupabaseClient(env);

  // Query Supabase for company dividend data
  const { data, error } = await supabase
    .from("idx_company_report")
    .select("historical_dividends")
    .eq("symbol", symbol)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch dividend data for company: ${symbol} - ${error.message}`
    );
  }

  if (!data?.historical_dividends) {
    throw new Error(`No dividend data found for company: ${symbol}`);
  }

  // Find the dividend data for the specified year
  const yearData = (data.historical_dividends as any as YearlyDividend[]).find(
    (item) => item.year === year
  );

  if (!yearData) {
    throw new Error(`No dividend data found for ${symbol} in year ${year}`);
  }

  return yearData;
}

export function registerCompanyDividendTool(server: McpServer, env: any) {
  server.tool(
    "get-company-dividend",
    `Get detailed dividend information for a specific IDX company for a given year.
        
    This tool retrieves dividend data which includes:
    - year: The year of the dividend data
    - breakdown: Array of dividend payments for the year, each containing:
      - date: Payment date
      - total: Dividend amount
      - yield: Dividend yield
    - total_yield: Total yield for the year
    - total_dividend: Total dividend amount for the year
    
    Note: The company symbol must include the .JK suffix (e.g., "BBCA.JK")`,
    {
      symbol: z
        .string()
        .regex(/\.JK$/, "Symbol must end with .JK")
        .describe("Company symbol with .JK suffix (e.g., 'BBCA.JK')"),
      year: z
        .number()
        .min(1900)
        .max(2100)
        .describe("The year to get dividend information for"),
    },
    async ({ symbol, year }) => {
      try {
        const dividendData = await fetchCompanyDividend(env, symbol, year);

        return {
          content: [
            {
              type: "text",
              text: `Dividend Data for ${symbol} (${year}):\n\n${JSON.stringify(
                dividendData,
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
              text: `Error fetching company dividend data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
