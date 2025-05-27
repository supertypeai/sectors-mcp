import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface IndexDailyTransactionData {
  index_code: string;
  date: string;
  price: number;
}

export async function fetchIndexDaily(
  baseUrl: string,
  apiKey: string | undefined,
  indexCode: string,
  startDate?: string,
  endDate?: string
): Promise<IndexDailyTransactionData[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/index-daily/${indexCode}/`);
  
  if (startDate) url.searchParams.append("start", startDate);
  if (endDate) url.searchParams.append("end", endDate);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<IndexDailyTransactionData[]>(response);
}

export function registerIndexDailyTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-index-daily",
    "Fetch daily transaction data for a given index code",
    {
      index_code: z
        .string()
        .describe("Code of the index (e.g., 'ihsg', 'lq45', 'idx30')"),
      start_date: z
        .string()
        .optional()
        .describe("Start date in YYYY-MM-DD format (default: 30 days before end date)"),
      end_date: z
        .string()
        .optional()
        .describe("End date in YYYY-MM-DD format (default: today)")
    },
    async ({ index_code, start_date, end_date }) => {
      try {
        const data = await fetchIndexDaily(
          baseUrl,
          apiKey,
          index_code,
          start_date,
          end_date
        );

        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/index-daily/${index_code}/?${new URLSearchParams({
                ...(start_date ? { start: start_date } : {}),
                ...(end_date ? { end: end_date } : {})
              }).toString()}\n\nFetched daily transaction data for ${index_code}:\n\n${JSON.stringify(
                data,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
