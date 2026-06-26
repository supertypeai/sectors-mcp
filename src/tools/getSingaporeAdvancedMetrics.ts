import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

// Define types for the price data we expect from the database
interface PriceDataPoint {
  date: string;
  close: number | null;
  [key: string]: unknown;
}

// Type for the database response
interface CompanyReport {
  all_time_price?: PriceDataPoint[] | null;
  pe?: number | null;
  [key: string]: unknown;
}

// Each entry is a one-key {date: price} map, e.g. {"2026-05-12": 59.099998}.
type DatedPrice = Record<string, number>;

interface PriceRangeData {
  ytd_low: DatedPrice;
  "52_w_low": DatedPrice;
  "90_d_low": DatedPrice;
  ytd_high: DatedPrice;
  "52_w_high": DatedPrice;
  "90_d_high": DatedPrice;
  all_time_low: DatedPrice;
  all_time_high: DatedPrice;
}

function extractPrice(entry: DatedPrice | undefined, label: string): number {
  if (!entry) {
    throw new Error(`Missing price range entry: ${label}`);
  }
  const [, price] = Object.entries(entry)[0] ?? [];
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error(`Invalid price for ${label}`);
  }
  return price;
}

export interface EarningsYieldResult {
  symbol: string;
  earningsYield: number;
  pe: number;
}

export interface VolatilityResult {
  historicalVolatility: number;
  symbol: string;
  timeframe: string;
  high: number;
  low: number;
  priceRange: number;
  rangePercentage: number;
}

/**
 * Calculates the Earnings Yield for a given SGX company
 * Earnings Yield = 1 / PE
 */
export async function fetchEarningsYield(
  env: any,
  symbol: string
): Promise<EarningsYieldResult> {
  const supabase = createSupabaseClient(env);

  const { data, error } = await supabase
    .from("sgx_company_report")
    .select("pe")
    .eq("symbol", symbol)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch data for Singapore company: ${symbol} - ${
        error?.message || "Company not found"
      }`
    );
  }

  const { pe } = data as CompanyReport;

  if (pe === null || pe === undefined || pe <= 0) {
    throw new Error("PE ratio is not available or invalid");
  }

  const earningsYield = 1 / pe;

  return {
    symbol,
    earningsYield,
    pe,
  };
}

/**
 * Calculates the historical volatility for a given SGX company
 * Uses the price range data to estimate volatility based on high/low ranges
 */
export async function fetchHistoricalVolatility(
  env: any,
  symbol: string,
  useTimeframe: "90d" | "52w" | "all_time"
): Promise<VolatilityResult> {
  const supabase = createSupabaseClient(env);

  const { data, error } = await supabase
    .from("sgx_company_report")
    .select("all_time_price")
    .eq("symbol", symbol)
    .single();

  if (error || !data) {
    throw new Error(
      `Failed to fetch price data for Singapore company: ${symbol} - ${
        error?.message || "Company not found"
      }`
    );
  }

  const priceData = data as unknown as { all_time_price: PriceRangeData };

  if (!priceData.all_time_price) {
    throw new Error("No price range data available for this company");
  }

  const range = priceData.all_time_price;
  let high: number;
  let low: number;
  let days: number;

  // Select the appropriate high/low based on the timeframe.
  // Each price-range entry is a one-key {date: price} map, so pull the value
  // out via Object.entries rather than a .price field that does not exist.
  switch (useTimeframe) {
    case "90d":
      high = extractPrice(range["90_d_high"], "90_d_high");
      low = extractPrice(range["90_d_low"], "90_d_low");
      days = 90;
      break;
    case "52w":
      high = extractPrice(range["52_w_high"], "52_w_high");
      low = extractPrice(range["52_w_low"], "52_w_low");
      days = 252; // Approximate trading days in a year
      break;
    case "all_time":
      high = extractPrice(range.all_time_high, "all_time_high");
      low = extractPrice(range.all_time_low, "all_time_low");
      days = 5 * 252; // Approximate trading days in 5 years
      break;
  }

  // Calculate the price range as a percentage of the average price
  const avgPrice = (high + low) / 2;
  const priceRange = high - low;
  const rangePercentage = priceRange / avgPrice;

  // Estimate annualized volatility
  // This is a simplified approach - in practice, you'd want more sophisticated calculations
  const tradingDaysPerYear = 252;
  const annualizedVolatility =
    (rangePercentage / Math.sqrt(days / tradingDaysPerYear)) * 100;

  return {
    historicalVolatility: annualizedVolatility,
    symbol,
    timeframe: useTimeframe,
    high,
    low,
    priceRange,
    rangePercentage: rangePercentage * 100, // as percentage
  };
}

export function registerSingaporeEarningsYieldTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "calculate-singapore-earnings-yield",
    `Calculate the Earnings Yield for a specific SGX (Singapore Exchange) company.
    Earnings Yield = 1 / PE
    
    Returns:
    - symbol: Company symbol
    - earningsYield: Calculated earnings yield
    - pe: Price-to-earnings ratio`,
    {
      symbol: z
        .string()
        .describe("The stock symbol of the Singapore company"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ symbol }) => {
      try {
        const result = await fetchEarningsYield(env, symbol);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error calculating earnings yield: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

export function registerSingaporeHistoricalVolatilityTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "calculate-singapore-historical-volatility",
    `Calculate the historical volatility for a specific SGX (Singapore Exchange) company using available price range data.
    
    Uses the price range data to estimate volatility based on high/low ranges.
    
    Returns:
    - historicalVolatility: Estimated annualized volatility percentage
    - symbol: Company symbol
    - timeframe: Timeframe used for calculation
    - high: High price in the timeframe
    - low: Low price in the timeframe
    - priceRange: Price range (high - low)
    - rangePercentage: Range as percentage of average price`,
    {
      symbol: z
        .string()
        .describe("The stock symbol of the Singapore company"),
      useTimeframe: z
        .enum(["90d", "52w", "all_time"])
        .default("90d")
        .describe("Timeframe to use for volatility calculation"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ symbol, useTimeframe }) => {
      try {
        const result = await fetchHistoricalVolatility(
          env,
          symbol,
          useTimeframe
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error calculating historical volatility: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
