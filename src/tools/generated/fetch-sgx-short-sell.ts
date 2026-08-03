import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxShortSell(
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

  const url = new URL(`${baseUrl}/sgx/short-sell/`);
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

export function registerFetchSgxShortSellTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-sgx-short-sell",
    {
      description: "Returns SGX short sell data. Supports filtering by symbol and date range.\n\n<Note>SGX symbol: 3 characters (letters or digits). E.g. `D05`, `U11`, `Z74`.</Note>\n\n<Note>Date filters: both `start` and `end` are independent and optional — omit either side to leave that bound unconstrained. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("SGX symbol to filter by. E.g. `D05`, `U11`.").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Optional; if omitted, no lower bound is applied. Filters on `date`.").optional(),
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
      const result = await fetchSgxShortSell(baseUrl, apiKey, params);
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
