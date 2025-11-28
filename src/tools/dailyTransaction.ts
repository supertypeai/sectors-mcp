import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

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
  const url = new URL(`${baseUrl}/daily/${ticker}`);
  
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
      ticker: z.string()
        .min(4, 'Ticker must be at least 4 characters')
        .regex(/^[A-Za-z]+\.?[Jj][Kk]?$/, 'Ticker must be 4+ letters, optionally followed by .JK')
        .transform(s => s.toUpperCase())
        .describe('Stock ticker symbol (e.g., BBCA.JK)'),
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
        if (!ticker) {
          throw new Error('Ticker parameter is required');
        }
        
        // Normalize ticker format to always include .JK if not present
        const normalizedTicker = ticker.includes('.') ? ticker : `${ticker}.JK`;
        
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
              text: `API URL: ${baseUrl}/daily/${normalizedTicker}?${new URLSearchParams({
                ...(startDate ? { start: startDate } : {}),
                ...(endDate ? { end: endDate } : {})
              }).toString()}\n\nFetched daily transaction data for ${normalizedTicker}:\n\n${JSON.stringify(
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
