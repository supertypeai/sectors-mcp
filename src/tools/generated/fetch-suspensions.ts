import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSuspensions(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/suspensions/`);
  if (params.symbol !== undefined) {
    url.searchParams.append("symbol", String(params.symbol));
  }
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSuspensionsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-suspensions",
    {
      description: "Returns a paginated list of historical IDX-listed stock suspensions, including the date a stock was suspended, the official reason, and a link to the IDX PDF notice. Filter by `symbol` to look up a specific company's suspension history, or by `start` / `end` to scope to a date window.\n\n<Note>Date filters: both `start` and `end` are independent and optional — omit either side to leave that bound unconstrained. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("Optional filter by IDX symbol (case-insensitive). E.g. `BBCA`, `GOTO`.").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Optional; if omitted, no lower bound is applied. Filters on `suspension_date`.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Optional; if omitted, no upper bound is applied. Future dates return 400.").optional(),
      limit: z.number()
        .describe("Items per page. Max 30.").optional(),
      offset: z.number()
        .describe("Number of items to skip.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchSuspensions(baseUrl, apiKey, params);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
