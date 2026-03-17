import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";
import { normalizeIdxTicker } from "../utils/tickers.js";

export interface DailyTransactionData {
  symbol: string;
  date: string;
  close: number;
  volume: number;
  market_cap: number;
}

export async function fetchDailyTransactionData(
  baseUrl: string,
  apiKey: string | undefined,
  ticker: string,
  startDate?: string,
  endDate?: string
): Promise<DailyTransactionData[]> {
  const normalizedTicker = normalizeIdxTicker(ticker, "withSuffix");
  const url = new URL(`${baseUrl}/daily/${normalizedTicker}`);
  
  // Add query parameters if provided
  if (startDate) url.searchParams.append('start', startDate);
  if (endDate) url.searchParams.append('end', endDate);

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<DailyTransactionData[]>(response);
}

export function registerDailyTransactionTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-daily-transaction",
    "Fetch daily transaction data for a given ticker within a date range",
    {
      ticker: z
        .string()
        .min(1, "Ticker is required")
        .describe("IDX stock ticker symbol (e.g., 'BBCA' or 'BBCA.JK')"),
      startDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .optional()
        .describe('Start date in YYYY-MM-DD format (optional)'),
      endDate: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
        .optional()
        .describe('End date in YYYY-MM-DD format (optional, defaults to today)'),
    },
    async ({ ticker, startDate, endDate }) => {
      try {
        const normalizedTicker = normalizeIdxTicker(ticker, "withSuffix");
        const url = new URL(`${baseUrl}/daily/${normalizedTicker}`);

        if (startDate) url.searchParams.append("start", startDate);
        if (endDate) url.searchParams.append("end", endDate);
        
        const data = await fetchDailyTransactionData(
          baseUrl,
          apiKey,
          normalizedTicker,
          startDate,
          endDate
        );
        
        if (!data || data.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No data found for ticker: ${normalizedTicker}`,
              },
            ],
          };
        }
        
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${url.toString()}\n\nFetched daily transaction data for ${normalizedTicker}:\n\n${JSON.stringify(
                data,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error: any) {
        let errorMessage = 'An unknown error occurred while fetching transaction data';
        
        if (error instanceof Error) {
          if (error.message.includes('API error')) {
            errorMessage = `Failed to fetch transaction data: ${error.message}. Please check if the ticker symbol is correct and try again.`;
          } else {
            errorMessage = `Error fetching transaction data: ${error.message}`;
          }
        }
        
        return { 
          content: [{ 
            type: "text", 
            text: errorMessage 
          }],
          isError: true
        };
      }
    }
  );
}
