import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxFilings(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  transaction_type?: "award" | "buy" | "others" | "sell" | "transfer";
  holder_type?: "insider" | "institution";
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/filings/`);
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
  if (params.transaction_type !== undefined) {
    url.searchParams.append("transaction_type", String(params.transaction_type));
  }
  if (params.holder_type !== undefined) {
    url.searchParams.append("holder_type", String(params.holder_type));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxFilingsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-filings",
    "Returns SGX insider trading filings — buy/sell transactions by company insiders and major shareholders. Supports filtering by symbol, transaction type, holder type, and date range.\n\n<Note>SGX symbol: 3 characters (letters or digits). E.g. `D05`, `U11`, `Z74`.</Note>\n\n<Note>Date filters: both `start` and `end` are independent and optional — omit either side to leave that bound unconstrained. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      symbol: z.string()
        .describe("SGX symbol to filter by. E.g. `D05`, `U11`.").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Optional; if omitted, no lower bound is applied. Filters on `timestamp`.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Optional; if omitted, no upper bound is applied. Future dates return 400.").optional(),
      limit: z.number()
        .describe("Number of results to return. Maximum: 30.").optional(),
      offset: z.number()
        .describe("Number of results to skip for pagination.").optional(),
      transaction_type: z.enum(["award", "buy", "others", "sell", "transfer"])
        .describe("Filter by transaction type (case-insensitive).").optional(),
      holder_type: z.enum(["insider", "institution"])
        .describe("Filter by holder type (case-insensitive).").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchSgxFilings(baseUrl, apiKey, params);
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
