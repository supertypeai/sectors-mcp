import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchIdxMarketCap(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  start?: string;
  end?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/idx-total/`);
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchIdxMarketCapTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-idx-market-cap",
    "Returns historical total IDX market capitalization for a date range of up to 90 days.\n\n<Note>Earliest available data is from **January 1, 2021**. Requesting earlier dates returns 400.</Note>\n\n<Note>Date range: defaults to last 30 days. Max window 90 days; wider ranges are clamped to the most recent 90 days ending at `end`. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Earliest valid: `2021-01-01`. Defaults to 30 days before `end`. Wider ranges are clamped to the most recent 90 days.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Defaults to today. Future dates return 400.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchIdxMarketCap(baseUrl, apiKey, params);
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
