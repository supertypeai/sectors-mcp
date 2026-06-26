import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface FilingsPagination {
  total_count: number;
  showing: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_previous: boolean;
  next_offset: number | null;
  previous_offset: number | null;
}

export interface FilingItem {
  title: string;
  body: string;
  source: string;
  timestamp: string;
  sector: string;
  sub_sector: string;
  tags: string[];
  symbol: string;
  transaction_type: string;
  holder_type: string;
  holder_name: string;
  holding_before: number;
  holding_after: number;
  amount_transaction: number;
  price: string;
  transaction_value: string;
  share_percentage_before: number;
  share_percentage_after: number;
  share_percentage_transaction: number;
  [key: string]: unknown;
}

export interface FilingsResponse {
  results: FilingItem[];
  pagination: FilingsPagination;
}

export interface FilingsParams {
  symbol?: string;
  sector?: string;
  sub_sector?: string;
  tags?: string;
  transaction_type?: "buy" | "sell";
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function fetchFilings(
  baseUrl: string,
  apiKey: string | undefined,
  params: FilingsParams = {}
): Promise<FilingsResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/filings/`);
  const { symbol, sector, sub_sector, tags, transaction_type, start, end, limit, offset } =
    params;

  if (symbol) url.searchParams.append("symbol", symbol);
  if (sector) url.searchParams.append("sector", sector);
  if (sub_sector) url.searchParams.append("sub_sector", sub_sector);
  if (tags) url.searchParams.append("tags", tags);
  if (transaction_type) url.searchParams.append("transaction_type", transaction_type);
  if (start) url.searchParams.append("start", start);
  if (end) url.searchParams.append("end", end);
  if (limit !== undefined) url.searchParams.append("limit", String(limit));
  if (offset !== undefined) url.searchParams.append("offset", String(offset));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<FilingsResponse>(response);
}

export function registerFilingsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-filings",
    `Fetch IDX insider/institutional ownership filings. Returns { results, pagination }.
All filters are optional; combine to narrow results.`,
    {
      symbol: z
        .string()
        .optional()
        .describe("Filter by a single ticker symbol (e.g. 'BBCA.JK')"),
      sector: z
        .string()
        .optional()
        .describe("Filter by sector slug in kebab-case"),
      sub_sector: z
        .string()
        .optional()
        .describe("Filter by sub-sector slug in kebab-case"),
      tags: z
        .string()
        .optional()
        .describe("Comma-separated tag slugs (see fetch-tags)"),
      transaction_type: z
        .enum(["buy", "sell"])
        .optional()
        .describe("Filter by transaction direction"),
      start: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      end: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("End date (YYYY-MM-DD)"),
      limit: z
        .number()
        .int()
        .optional()
        .describe("Number of results per page (default 20)"),
      offset: z
        .number()
        .int()
        .optional()
        .describe("Pagination offset (default 0)"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async (params) => {
      try {
        const filings = await fetchFilings(baseUrl, apiKey, params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(filings, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
