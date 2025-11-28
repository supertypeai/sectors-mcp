import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createSupabaseClient } from "../lib/supabaseClient.js";

// Define the DailyData interface based on the table structure
export interface SingaporeDailyData {
  close: number | null;
  date: string;
  market_cap: number | null;
  symbol: string;
  volume: number | null;
}

export async function fetchSingaporeDailyTransaction(
  env: any,
  symbols: string[],
  startDate: string,
  endDate: string
): Promise<SingaporeDailyData[]> {
  const supabase = createSupabaseClient(env);

  // Query Supabase for company data with close fields
  const { data, error } = await supabase
    .from("sgx_company_report")
    .select("symbol, close, market_cap, volume")
    .in("symbol", symbols);

  if (error) {
    throw new Error(
      `Failed to fetch daily data for Singapore symbols: ${symbols.join(
        ", "
      )} - ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Process the data to extract daily information within the date range
  const dailyData: SingaporeDailyData[] = [];

  for (const company of data) {
    const closeData = company.close as Record<string, number>;

    // Process close data
    for (const [date, value] of Object.entries(closeData)) {
      // Only include data within the specified date range
      if (date >= startDate && date <= endDate) {
        dailyData.push({
          symbol: company.symbol!,
          date,
          close: value,
          market_cap: company.market_cap,
          volume: company.volume,
        });
      }
    }
  }

  // Sort the data by date
  dailyData.sort((a, b) => a.date.localeCompare(b.date));

  return dailyData;
}

export function registerSingaporeDailyTransactionTool(
  server: McpServer,
  env: any
) {
  server.tool(
    "get-singapore-daily-transaction",
    `Get daily trading data for specific SGX (Singapore Exchange) companies within a date range.
  The tool uses the close JSON fields to extract daily trading data.
  
  Available data points:
  - close: Closing price (number)
  - date: Trading date (string in YYYY-MM-DD format)
  - market_cap: Market capitalization (number)
  - symbol: Stock ticker symbol (string)
  - volume: Trading volume (number)

  The tool returns daily trading data for specified Singapore companies within the given date range.`,
    {
      symbols: z
        .array(z.string())
        .describe("Array of Singapore stock symbols to retrieve data for"),
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
        const dailyData = await fetchSingaporeDailyTransaction(
          env,
          symbols,
          startDate,
          endDate
        );

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(dailyData, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching Singapore daily trading data: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
