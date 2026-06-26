import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

// ---------------------------------------------------------------------------
// Shared helpers (mirrors src/tools/miningLicenses.ts)
// ---------------------------------------------------------------------------
async function getJson<T>(
  baseUrl: string,
  apiKey: string | undefined,
  path: string,
  search?: URLSearchParams
): Promise<T> {
  if (!apiKey) throw new Error("SECTORS_API_KEY is not defined");
  const url = new URL(`${baseUrl}${path}`);
  if (search) url.search = search.toString();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<T>(response);
}

function ok(url: string, data: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: `API URL: ${url}\n\n${JSON.stringify(data, null, 2)}`,
      },
    ],
  };
}

function err(error: any) {
  return {
    content: [{ type: "text" as const, text: `Error: ${error.message}` }],
    isError: true,
  };
}

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// /sgx/buybacks/ — SGX Share Buybacks (paginated)
// ---------------------------------------------------------------------------
export function registerSgxBuybacksTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-buybacks",
    "List SGX share buybacks (paginated). Optionally filter by symbol and a date range.",
    {
      symbol: z
        .string()
        .optional()
        .describe("Filter to a single SGX ticker (e.g. 'D05.SI')"),
      start: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      end: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
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
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/sgx/buybacks/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/sgx/buybacks/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /sgx/daily/{symbol}/ — SGX Daily Price Data
// ---------------------------------------------------------------------------
export function registerSgxDailyTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-daily-transaction",
    "Daily price/transaction data for an SGX company by ticker symbol over an optional date range.",
    {
      symbol: z.string().describe("SGX ticker symbol (e.g. 'D05.SI')"),
      start: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      end: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("End date (YYYY-MM-DD)"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ symbol, ...rest }) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const path = `/sgx/daily/${encodeURIComponent(symbol)}/`;
        const data = await getJson<unknown>(baseUrl, apiKey, path, search);
        const qs = search.toString();
        return ok(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /sgx/filings/ — SGX Insider Filings (paginated)
// ---------------------------------------------------------------------------
export function registerSgxFilingsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-filings",
    "List SGX insider filings (paginated). Filter by symbol, date range, transaction_type and holder_type.",
    {
      symbol: z
        .string()
        .optional()
        .describe("Filter to a single SGX ticker (e.g. 'D05.SI')"),
      start: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      end: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("End date (YYYY-MM-DD)"),
      transaction_type: z
        .enum(["award", "buy", "others", "sell", "transfer"])
        .optional()
        .describe("Filter by transaction type"),
      holder_type: z
        .enum(["insider", "institution"])
        .optional()
        .describe("Filter by holder type"),
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
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/sgx/filings/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/sgx/filings/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /sgx/news/ — SGX News (paginated)
// ---------------------------------------------------------------------------
export function registerSgxNewsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-news",
    "List SGX news articles (paginated). Filter by sector, sub_sector, tags, symbols and a date range.",
    {
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
        .describe("Comma-separated tag slugs (see fetch-sgx-tags)"),
      symbols: z
        .string()
        .optional()
        .describe("Comma-separated SGX ticker symbols (e.g. 'D05.SI,U11.SI')"),
      start: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      end: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
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
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/sgx/news/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/sgx/news/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /sgx/short-sell/ — SGX Short Sell (paginated)
// ---------------------------------------------------------------------------
export function registerSgxShortSellTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-short-sell",
    "List SGX short-sell data (paginated). Optionally filter by symbol and a date range.",
    {
      symbol: z
        .string()
        .optional()
        .describe("Filter to a single SGX ticker (e.g. 'D05.SI')"),
      start: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      end: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
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
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/sgx/short-sell/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/sgx/short-sell/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /sgx/tags/ — SGX News Tags
// ---------------------------------------------------------------------------
export function registerSgxTagsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-tags",
    "List available SGX news tags (no parameters). Use returned slugs to filter fetch-sgx-news.",
    {},
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async () => {
      try {
        const data = await getJson<unknown>(baseUrl, apiKey, "/sgx/tags/");
        return ok(`${baseUrl}/sgx/tags/`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}
