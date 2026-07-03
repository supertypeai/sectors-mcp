import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchIndexDaily(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  index_code: string;
  start?: string;
  end?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/index-daily/${params.index_code}/`);
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

export function registerFetchIndexDailyTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-index-daily",
    "Returns daily closing price for a given IDX index over a date range of up to 90 days.\n\n<Note>Earliest available data is from **January 2, 2019**.</Note>\n\n<Accordion title=\"Available index codes\">\n`ftse`, `idx30`, `idxbumn20`, `idxesgl`, `idxg30`, `idxhidiv20`, `idxq30`, `idxv30`, `ihsg`, `jii70`, `kompas100`, `lq45`, `sminfra18`, `srikehati`, `sti`, `economic30`, `idxvesta28`\n</Accordion>\n\n<Note>Date range: defaults to last 30 days. Max window 90 days; wider ranges are clamped to the most recent 90 days ending at `end`. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      index_code: z.string()
        .describe("Index code. E.g. `lq45`, `ihsg`, `idx30`."),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Defaults to 30 days before `end`. Wider ranges are clamped to the most recent 90 days.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Defaults to today. Future dates return 400.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchIndexDaily(baseUrl, apiKey, params);
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
