import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

// Define the DailyData interface based on the table structure
export interface DailyData {
  close: number | null;
  date: string;
  market_cap: number | null;
  symbol: string;
  volume: number | null;
}

export async function fetchDailyTransaction(
  env: any,
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<DailyData[]> {
  const supabase = createSupabaseClient(env);

  // Query Supabase for daily data
  const { data, error } = await supabase
    .from("idx_daily_data")
    .select("close, date, market_cap, symbol, volume")
    .in("symbol", symbols)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch daily data for symbols: ${symbols.join(", ")} - ${
        error.message
      }`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data as unknown as DailyData[];
}

export function registerDailyTransactionTool(server: McpServer, env: any) {
  server.tool(
    "get-daily-transaction",
    `Get daily trading data for specific companies within a date range.
  Available columns from idx_daily_data:
  - close: Closing price (number)
  - date: Trading date (string in YYYY-MM-DD format)
  - market_cap: Market capitalization (number)
  - symbol: Stock ticker symbol (string)
  - volume: Trading volume (number)

  The tool returns daily trading data for specified companies within the given date range.`,
    {
      symbols: z
        .array(z.string())
        .describe("Array of stock symbols to retrieve data for"),
      startDate: z
        .string()
        .optional()
        .default(() => {
          const date = new Date();
          date.setDate(1);
          return date.toISOString().split("T")[0];
        })
        .describe(
          "Start date for the data range in YYYY-MM-DD format. Defaults to first day of current month."
        ),
      endDate: z
        .string()
        .optional()
        .default(() => new Date().toISOString().split("T")[0])
        .describe(
          "End date for the data range in YYYY-MM-DD format. Defaults to today."
        ),
    },
    async ({ symbols, startDate, endDate }) => {
      try {
        const dailyData = await fetchDailyTransaction(
          env,
          symbols,
          startDate,
          endDate
        );

        return {
          content: [
            {
              type: "text",
              text: `Daily Trading Data (${startDate} to ${endDate}) for ${symbols.join(
                ", "
              )}:\n\n${JSON.stringify(dailyData, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching daily trading data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
