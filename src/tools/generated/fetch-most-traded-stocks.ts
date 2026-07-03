import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMostTradedStocks(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sub_sector?: string;
  start?: string;
  end?: string;
  adjusted?: boolean;
  n_stock?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/most-traded/`);
  if (params.sub_sector !== undefined) {
    url.searchParams.append("sub_sector", String(params.sub_sector));
  }
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }
  if (params.adjusted !== undefined) {
    url.searchParams.append("adjusted", String(params.adjusted));
  }
  if (params.n_stock !== undefined) {
    url.searchParams.append("n_stock", String(params.n_stock));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMostTradedStocksTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-most-traded-stocks",
    "Returns the most traded IDX stocks by transaction volume over a date range of up to 90 days. Results are keyed by date.\n\n<Note>Date range: defaults to last 30 days. Max window 90 days; wider ranges are clamped to the most recent 90 days ending at `end`. Future `end` dates return 400.</Note>\n\n<Info>Costs 2 API credits.</Info>",
    {
      sub_sector: z.string()
        .describe("Filter by kebab-case subsector slug. E.g. `banks`. Get valid values from the [Subsectors](./helper-list/subsectors) endpoint.").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Defaults to 30 days before `end`. Wider ranges are clamped to the most recent 90 days.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Defaults to today. Future dates return 400.").optional(),
      adjusted: z.boolean()
        .describe("If `true`, rank by volume × closing price instead of raw volume.").optional(),
      n_stock: z.number()
        .describe("Number of tickers per day. Default 5, max 10.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMostTradedStocks(baseUrl, apiKey, params);
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
