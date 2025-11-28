import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface TradedStock {
  symbol: string;
  company_name: string;
  volume: number;
  price: number;
}

export interface MostTradedData {
  [date: string]: TradedStock[];
}

export async function fetchMostTradedStocks(
  baseUrl: string,
  apiKey: string | undefined,
  startDate?: string,
  endDate?: string,
  nStock: number = 5,
  adjusted: boolean = false,
  subSector: string = "all"
): Promise<MostTradedData> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/most-traded/`);
  
  // Add query parameters if provided
  if (startDate) url.searchParams.append("start", startDate);
  if (endDate) url.searchParams.append("end", endDate);
  if (nStock !== undefined) url.searchParams.append("n_stock", nStock.toString());
  if (adjusted !== undefined) url.searchParams.append("adjusted", adjusted.toString());
  if (subSector) url.searchParams.append("sub_sector", subSector);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<MostTradedData>(response);
}

export function registerMostTradedTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-most-traded-stocks",
    "Fetch the most traded stocks by volume for a given date range",
    {
      startDate: z
        .string()
        .optional()
        .describe("Start date in YYYY-MM-DD format. Defaults to 30 days before end date. Must be within 90 days of end date."),
      endDate: z
        .string()
        .optional()
        .describe("End date in YYYY-MM-DD format. Defaults to today. Must be within 90 days of start date."),
      nStock: z
        .number()
        .int()
        .min(1)
        .max(10)
        .default(5)
        .describe("Number of stocks to return (1-10). Defaults to 5."),
      adjusted: z
        .boolean()
        .default(false)
        .describe("If true, sort by transaction volume multiplied by closing price. Defaults to false."),
      subSector: z
        .string()
        .default("all")
        .describe("Subsector to filter by. Use 'all' for all subsectors. Get available subsectors from the subsectors endpoint.")
    },
    async ({
      startDate,
      endDate,
      nStock = 5,
      adjusted = false,
      subSector = "all",
    }) => {
      try {
        const result = await fetchMostTradedStocks(
          baseUrl,
          apiKey,
          startDate,
          endDate,
          nStock,
          adjusted,
          subSector
        );
        
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2)
          }]
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : typeof error === 'string' 
            ? error 
            : 'An unknown error occurred while fetching most traded stocks';
            
        return {
          content: [{
            type: "text" as const,
            text: errorMessage
          }],
          isError: true
        };
      }
    }
  );
}
