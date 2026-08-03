import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchBrokerSummary(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  broker_code?: string;
  start?: string;
  end?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/broker-summary/${params.symbol}/`);
  if (params.broker_code !== undefined) {
    url.searchParams.append("broker_code", String(params.broker_code));
  }
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

export function registerFetchBrokerSummaryTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-broker-summary",
    {
      description: "Per-broker daily trading rows for one IDX ticker over a date range up to 14 days, grouped by date. Optionally filter to a single broker via `broker_code`. Each entry in `data` lists every broker active on that day with buy/sell/net values, lots, frequency, and weighted avg price per share.\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BBCA`, `GOTO`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("IDX ticker symbol. E.g. `BBCA`, `GOTO`."),
      broker_code: z.string()
        .describe("Optional filter to a single broker code (e.g. `MG`).").optional(),
      start: z.string()
        .describe("Start date (YYYY-MM-DD). Default: end - 14 days.").optional(),
      end: z.string()
        .describe("End date (YYYY-MM-DD). Default: today.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchBrokerSummary(baseUrl, apiKey, params);
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
