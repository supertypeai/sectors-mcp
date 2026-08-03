import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchBrokerSummaryTop(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol: string;
  start?: string;
  end?: string;
  cohort?: "all" | "institutional" | "mixed" | "retail" | "unknown";
  n_brokers?: number;
  origin?: "all" | "domestic" | "foreign";
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/broker-summary/${params.symbol}/top/`);
  if (params.start !== undefined) {
    url.searchParams.append("start", String(params.start));
  }
  if (params.end !== undefined) {
    url.searchParams.append("end", String(params.end));
  }
  if (params.cohort !== undefined) {
    url.searchParams.append("cohort", String(params.cohort));
  }
  if (params.n_brokers !== undefined) {
    url.searchParams.append("n_brokers", String(params.n_brokers));
  }
  if (params.origin !== undefined) {
    url.searchParams.append("origin", String(params.origin));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchBrokerSummaryTopTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-broker-summary-top",
    {
      description: "Returns the brokers most actively accumulating and distributing a single IDX ticker over a date range. `top_buyers` ranks brokers by net buy value (largest positive net IDR first); `top_sellers` ranks brokers by net sell value (largest negative net IDR first). Useful for spotting institutional accumulation or distribution patterns on a specific stock.\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BBCA`, `GOTO`.</Note>\n\n<Info>Costs 2 API credits.</Info>",
      inputSchema: z.object({
      symbol: z.string()
        .describe("IDX ticker symbol. E.g. `BBCA`, `GOTO`."),
      start: z.string()
        .describe("Start date (YYYY-MM-DD). Default: end - 30 days.").optional(),
      end: z.string()
        .describe("End date (YYYY-MM-DD). Default: today.").optional(),
      cohort: z.enum(["all", "institutional", "mixed", "retail", "unknown"])
        .describe("Filter brokers by cohort (case-insensitive). Default `all`.").optional(),
      n_brokers: z.number()
        .describe("How many buyers and sellers to return each (default 10, max 90).").optional(),
      origin: z.enum(["all", "domestic", "foreign"])
        .describe("Filter brokers by origin. Default `all`.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchBrokerSummaryTop(baseUrl, apiKey, params);
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
