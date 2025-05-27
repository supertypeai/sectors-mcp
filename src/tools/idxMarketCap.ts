import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface IDXMarketCapData {
  date: string;
  idx_total_market_cap: number;
}

export async function fetchIDXMarketCap(
  baseUrl: string,
  apiKey: string | undefined,
  startDate?: string,
  endDate?: string
): Promise<IDXMarketCapData[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/idx-total/`);
  
  // Add query parameters if provided
  if (startDate) url.searchParams.append("start", startDate);
  if (endDate) url.searchParams.append("end", endDate);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<IDXMarketCapData[]>(response);
}

export function registerIDXMarketCapTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-idx-market-cap",
    "Fetch historical IDX market capitalization data",
    {
      startDate: z
        .string()
        .optional()
        .describe("Start date in YYYY-MM-DD format. Defaults to 30 days before end date."),
      endDate: z
        .string()
        .optional()
        .describe("End date in YYYY-MM-DD format. Defaults to today."),
    },
    async ({ startDate, endDate }) => {
      try {
        const marketCapData = await fetchIDXMarketCap(
          baseUrl,
          apiKey,
          startDate,
          endDate
        );

        return {
          content: [
            {
              type: "text",
              text: `IDX Market Cap Data (${startDate || '30d ago'} to ${endDate || 'today'}):\n\n${JSON.stringify(
                marketCapData,
                null,
                2
              )}`,
            },
          ],
          _meta: {
            type: "idx_market_cap",
            startDate,
            endDate,
            dataPointCount: marketCapData.length,
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching IDX market cap data: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
