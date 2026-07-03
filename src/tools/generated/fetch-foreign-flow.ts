import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchForeignFlow(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  start?: string;
  end?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/foreign-flow/${params.symbol}/`);
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

export function registerFetchForeignFlowTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-foreign-flow",
    "Daily net foreign-broker inflow (IDR) for one IDX ticker over a date range up to 90 days. Positive `net_foreign_inflow` means foreign brokers were net buyers that day; negative means foreign brokers were net sellers. Useful for tracking foreign sentiment and capital flow on a specific stock.\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BBCA`, `GOTO`.</Note>\n\n<Note>Only foreign flow is returned because the exchange is a closed market: for any `(symbol, date)`, foreign and domestic net values always sum to zero, so domestic flow is simply `-net_foreign_inflow`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      symbol: z.string()
        .describe("IDX ticker symbol. E.g. `BBCA`, `GOTO`."),
      start: z.string()
        .describe("Start date (YYYY-MM-DD). Default: end - 30 days.").optional(),
      end: z.string()
        .describe("End date (YYYY-MM-DD). Default: today.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchForeignFlow(baseUrl, apiKey, params);
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
