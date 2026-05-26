import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";
import { normalizeIdxTicker } from "../utils/tickers.js";

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

// Shape stored in idx_company_report.historical_dividends: an object keyed
// by year string ("2020", "2021", ...), each value containing the year's
// breakdown/total_yield/total_dividend. The 'year' field itself is the key,
// so it is synthesized from the key when returning a YearlyDividend.
type HistoricalDividendsMap = Record<
  string,
  Omit<YearlyDividend, "year"> | null | undefined
>;

export async function fetchCompanyDividend(
  env: any,
  symbol: string,
  year: number
): Promise<YearlyDividend> {
  const supabase = createSupabaseClient(env);
  const normalizedSymbol = normalizeIdxTicker(symbol, "withSuffix");

  // Query Supabase for company dividend data
  const { data, error } = await supabase
    .from("idx_company_report")
    .select("historical_dividends")
    .eq("symbol", normalizedSymbol)
    .single();

  if (error) {
    throw new Error(
      `Failed to fetch dividend data for company: ${symbol} - ${error.message}`
    );
  }

  if (!data?.historical_dividends) {
    throw new Error(`No dividend data found for company: ${normalizedSymbol}`);
  }

  const dividends = data.historical_dividends as unknown;
  if (
    typeof dividends !== "object" ||
    dividends === null ||
    Array.isArray(dividends)
  ) {
    throw new Error(
      `Dividend data for ${normalizedSymbol} is malformed (expected year-keyed object)`
    );
  }

  const yearKey = String(year);
  const yearEntry = (dividends as HistoricalDividendsMap)[yearKey];

  if (!yearEntry) {
    throw new Error(
      `No dividend data found for ${normalizedSymbol} in year ${year}`
    );
  }

  return { year, ...yearEntry };
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
    
    Accepts IDX tickers with or without the .JK suffix (e.g., "BBCA" or "BBCA.JK")`,
    {
      symbol: z
        .string()
        .min(1)
        .describe("IDX company symbol (e.g., 'BBCA' or 'BBCA.JK')"),
      year: z
        .number()
        .min(1900)
        .max(2100)
        .describe("The year to get dividend information for"),
    },
    { annotations: { readOnlyHint: true } },
    async ({ symbol, year }) => {
      try {
        const dividendData = await fetchCompanyDividend(env, symbol, year);

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
              text: `Error fetching company dividend data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
