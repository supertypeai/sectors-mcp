import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchClose(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  limit?: number;
  offset?: number;
  date?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/close/`);
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }
  if (params.date !== undefined) {
    url.searchParams.append("date", String(params.date));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchCloseTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-close",
    "Returns the daily closing price for **every** IDX ticker on a single trading day, in one paginated feed — instead of calling the per-symbol [Daily Transaction Data](./daily) endpoint once per ticker.\n\n<Note>Defaults to the most recent trading day. Pass `date` (`YYYY-MM-DD`) to pull a specific day. Future dates return 400.</Note>\n\n<Note>Tickers with no recorded close for the requested day are omitted.</Note>\n\n<Info>Costs 1 API credit per page. The full ~950-ticker universe is ~32 pages at the maximum `limit` of 30 (~32 credits per full pull).</Info>",
    {
      limit: z.number()
        .describe("Maximum number of tickers to return per page. Max: 30.").optional(),
      offset: z.number()
        .describe("Number of tickers to skip for pagination.").optional(),
      date: z.string()
        .describe("Trading day to pull, in `YYYY-MM-DD` format. Defaults to the most recent trading day with data. Future dates return 400.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchClose(baseUrl, apiKey, params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
