import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxNews(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sector?: string;
  sub_sector?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  tags?: string;
  symbols?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/news/`);
  if (params.sector !== undefined) {
    url.searchParams.append("sector", String(params.sector));
  }
  if (params.sub_sector !== undefined) {
    url.searchParams.append("sub_sector", String(params.sub_sector));
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
  if (params.tags !== undefined) {
    url.searchParams.append("tags", String(params.tags));
  }
  if (params.symbols !== undefined) {
    url.searchParams.append("symbols", String(params.symbols));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxNewsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-sgx-news",
    {
      description: "Returns paginated SGX news articles. Supports filtering by sector, sub-sector, tags, symbols, and date range.\n\n<Note>SGX symbol: 3 characters (letters or digits). E.g. `D05`, `U11`, `Z74`.</Note>\n\n<Note>Date filters: both `start` and `end` are independent and optional — omit either side to leave that bound unconstrained. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      sector: z.string()
        .describe("Filter by sector (case-insensitive).").optional(),
      sub_sector: z.string()
        .describe("Filter by sub-sector (case-insensitive).").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Optional; if omitted, no lower bound is applied. Filters on `timestamp`.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Optional; if omitted, no upper bound is applied. Future dates return 400.").optional(),
      limit: z.number()
        .describe("Items per page. Max 30.").optional(),
      offset: z.number()
        .describe("Number of items to skip.").optional(),
      tags: z.string()
        .describe("Comma-separated tag slugs. Get values from [SGX Tags](../singapore/sgx-tags).").optional(),
      symbols: z.string()
        .describe("Comma-separated SGX symbols. E.g. `D05,U11`.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchSgxNews(baseUrl, apiKey, params);
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
