import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

interface DividendBreakdown {
  date: string;
  amount: number;
  yield: number;
  type: string;
}

interface YearlyDividend {
  symbol: string;
  year: number;
  breakdown: DividendBreakdown[];
  total_dividend: number;
  total_yield: number;
  dividend_growth_rate: number | null;
  dividend_yield_5y_avg: number | null;
  payout_ratio: number | null;
}

export async function fetchSingaporeCompanyDividend(
  env: any,
  symbol: string,
  year: number
): Promise<YearlyDividend> {
  const supabase = createSupabaseClient(env);

  // Query Supabase for company dividend data
  const { data, error } = await supabase
    .from("sgx_company_report")
    .select(
      `
      symbol,
      historical_dividends,
      dividend_growth_rate,
      dividend_yield_5y_avg,
      payout_ratio
    `
    )
    .eq("symbol", symbol)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch dividend data for Singapore company: ${symbol} - ${error.message}`
    );
  }

  if (!data?.historical_dividends) {
    throw new Error(`No dividend data found for Singapore company: ${symbol}`);
  }

  const historicalDividends = data.historical_dividends as Record<
    string,
    {
      date: string;
      amount: number;
      yield: number;
      type: string;
    }[]
  >;

  // Filter dividends for the specified year
  const yearDividends = Object.entries(historicalDividends)
    .filter(([divYear]) => parseInt(divYear) === year)
    .map(([_, dividends]) => dividends)
    .flat();

  if (yearDividends.length === 0) {
    throw new Error(
      `No dividend data found for ${symbol} in year ${year}`
    );
  }

  // Calculate totals
  const totalDividend = yearDividends.reduce(
    (sum, div) => sum + div.amount,
    0
  );
  const totalYield = yearDividends.reduce((sum, div) => sum + div.yield, 0);

  const dividendData: YearlyDividend = {
    symbol,
    year,
    breakdown: yearDividends,
    total_dividend: totalDividend,
    total_yield: totalYield,
    dividend_growth_rate: data.dividend_growth_rate,
    dividend_yield_5y_avg: data.dividend_yield_5y_avg,
    payout_ratio: data.payout_ratio,
  };

  return dividendData;
}

export function registerSingaporeCompanyDividendTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "get-singapore-company-dividend",
    `Get detailed dividend information for a specific SGX (Singapore Exchange) company for a given year.
        
    This tool retrieves dividend data which includes:
    - year: The year of the dividend data
    - breakdown: Array of dividend payments for the year, each containing:
      - date: Payment date
      - amount: Dividend amount
      - yield: Dividend yield
      - type: Type of dividend (interim, final, special, etc.)
    - total_dividend: Total dividend amount for the year
    - total_yield: Total yield for the year
    - dividend_growth_rate: Year-over-year dividend growth rate
    - dividend_yield_5y_avg: 5-year average dividend yield
    - payout_ratio: Dividend payout ratio`,
    {
      symbol: z
        .string()
        .describe("Singapore company symbol (e.g., 'D05', 'O39')"),
      year: z
        .number()
        .min(1900)
        .max(2100)
        .describe("The year to get dividend information for"),
    },
    async ({ symbol, year }) => {
      try {
        const dividendData = await fetchSingaporeCompanyDividend(
          env,
          symbol,
          year
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(dividendData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching Singapore company dividend data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
