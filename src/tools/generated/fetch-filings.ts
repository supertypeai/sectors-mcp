import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchFilings(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  symbol?: string;
  sector?: string;
  sub_sector?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
  transaction_type?: "buy" | "others" | "sell";
  tags?: string;
  holder_type?: "corporate-investor" | "insider" | "institution";
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/filings/`);
  if (params.symbol !== undefined) {
    url.searchParams.append("symbol", String(params.symbol));
  }
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
  if (params.transaction_type !== undefined) {
    url.searchParams.append("transaction_type", String(params.transaction_type));
  }
  if (params.tags !== undefined) {
    url.searchParams.append("tags", String(params.tags));
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

export function registerFetchFilingsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-filings",
    "Returns IDX insider trading filings — buy/sell transactions by company insiders and major shareholders. Supports filtering by sector, subsector, tags, symbol, transaction type, holder_type, and date range.\n\n<Note>IDX symbol: 4 letters, optionally followed by `.jk` (case-insensitive). E.g. `BBCA`, `BMRI`, `TLKM`.</Note>\n\n<Note>Date filters: both `start` and `end` are independent and optional — omit either side to leave that bound unconstrained. Future `end` dates return 400.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      symbol: z.string()
        .describe("IDX symbol symbol to filter by. E.g. `BBCA`, `BMRI`.").optional(),
      sector: z.string()
        .describe("Kebab-case sector slug. E.g. `healthcare`, `financials`. Get valid values from the [Subsectors](../helper-list/subsectors) endpoint.").optional(),
      sub_sector: z.string()
        .describe("Kebab-case subsector slug. E.g. `banks`, `tobacco`. Get valid values from the [Subsectors](../helper-list/subsectors) endpoint.").optional(),
      start: z.string()
        .describe("Start date in `YYYY-MM-DD` format. Optional; if omitted, no lower bound is applied. Filters on `timestamp`.").optional(),
      end: z.string()
        .describe("End date in `YYYY-MM-DD` format. Optional; if omitted, no upper bound is applied. Future dates return 400.").optional(),
      limit: z.number()
        .describe("Number of results to return. Maximum: 30.").optional(),
      offset: z.number()
        .describe("Number of results to skip for pagination.").optional(),
      transaction_type: z.enum(["buy", "others", "sell"])
        .describe("Filter by transaction direction: `buy`, `sell`, or `others`.").optional(),
      tags: z.string()
        .describe("Comma-separated tag slugs. E.g. `Bullish,insider-trading`. Get valid values from the [News Tags](../helper-list/tags) endpoint.").optional(),
      holder_type: z.enum(["corporate-investor", "insider", "institution"])
        .describe("Filter by holder type (case-insensitive).").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchFilings(baseUrl, apiKey, params);
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
