import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface NewsPagination {
  total_count: number;
  showing: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_previous: boolean;
  next_offset: number | null;
  previous_offset: number | null;
}

export interface NewsArticle {
  created_at: string;
  title: string;
  body: string;
  source: string;
  timestamp: string;
  sector: string;
  sub_sector: string[];
  tags: string[];
  symbols: string[];
  thumbnail: string;
  dimension: string;
  commodity_type: string[];
  [key: string]: unknown;
}

export interface NewsResponse {
  results: NewsArticle[];
  pagination: NewsPagination;
}

export interface NewsParams {
  extension?: "idx" | "mining";
  sector?: string;
  sub_sector?: string;
  tags?: string;
  symbols?: string;
  keyword?: string;
  commodity_type?: string;
  start?: string;
  end?: string;
  limit?: number;
  offset?: number;
}

export async function fetchNews(
  baseUrl: string,
  apiKey: string | undefined,
  params: NewsParams = {}
): Promise<NewsResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/news/`);
  const {
    extension,
    sector,
    sub_sector,
    tags,
    symbols,
    keyword,
    commodity_type,
    start,
    end,
    limit,
    offset,
  } = params;

  if (extension) url.searchParams.append("extension", extension);
  if (sector) url.searchParams.append("sector", sector);
  if (sub_sector) url.searchParams.append("sub_sector", sub_sector);
  if (tags) url.searchParams.append("tags", tags);
  if (symbols) url.searchParams.append("symbols", symbols);
  if (keyword) url.searchParams.append("keyword", keyword);
  if (commodity_type) url.searchParams.append("commodity_type", commodity_type);
  if (start) url.searchParams.append("start", start);
  if (end) url.searchParams.append("end", end);
  if (limit !== undefined) url.searchParams.append("limit", String(limit));
  if (offset !== undefined) url.searchParams.append("offset", String(offset));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<NewsResponse>(response);
}

export function registerNewsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-news",
    `Fetch news articles. Returns { results, pagination }.
Use extension='idx' (default) for IDX equities news, or extension='mining' for
mining-sector news. IDX filters: sector, sub_sector, tags, symbols. Mining
filters: keyword, commodity_type.`,
    {
      extension: z
        .enum(["idx", "mining"])
        .optional()
        .describe("News stream: 'idx' (default) or 'mining'"),
      sector: z
        .string()
        .optional()
        .describe("IDX: filter by sector slug in kebab-case"),
      sub_sector: z
        .string()
        .optional()
        .describe("IDX: filter by sub-sector slug in kebab-case"),
      tags: z
        .string()
        .optional()
        .describe("Comma-separated tag slugs (see fetch-tags)"),
      symbols: z
        .string()
        .optional()
        .describe("IDX: comma-separated ticker symbols (e.g. 'BBCA.JK,BBRI.JK')"),
      keyword: z
        .string()
        .optional()
        .describe("Mining: free-text keyword search"),
      commodity_type: z
        .string()
        .optional()
        .describe("Mining: filter by commodity type"),
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
        const news = await fetchNews(baseUrl, apiKey, params);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(news, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
