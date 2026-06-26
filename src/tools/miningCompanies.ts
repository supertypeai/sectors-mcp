import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface MiningPagination {
  total_count: number;
  showing: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_previous: boolean;
  next_offset: number | null;
  previous_offset: number | null;
}

export interface MiningCompanyListItem {
  slug: string;
  name: string;
  symbol: string | null;
  company_type: string;
  key_operation: string;
  commodity_type: string[];
  [key: string]: unknown;
}

export interface MiningCompanyListResponse {
  results: MiningCompanyListItem[];
  pagination: MiningPagination;
}

const MINING_COMPANY_TYPES = [
  "Mine Owner",
  "Contractor",
  "Holding",
  "Manufacturer",
  "Trader",
  "Consultant",
] as const;

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

// ---------------------------------------------------------------------------
// List mining companies (paginated)
// ---------------------------------------------------------------------------
export function registerMiningCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-companies",
    "List mining companies (paginated). Filter by keyword, commodity_type, company_type, or has_financials. Returns { results, pagination }.",
    {
      keyword: z.string().optional().describe("Free-text search on company name"),
      commodity_type: z
        .string()
        .optional()
        .describe("Filter by commodity type (e.g. 'Nickel', 'Coal')"),
      company_type: z
        .enum(MINING_COMPANY_TYPES)
        .optional()
        .describe("Filter by company type"),
      has_financials: z
        .boolean()
        .optional()
        .describe("Only companies that have financial data"),
      limit: z
        .number()
        .int()
        .max(30)
        .optional()
        .describe("Results per page (default 20, max 30)"),
      offset: z
        .number()
        .int()
        .optional()
        .describe("Pagination offset (default 0)"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ keyword, commodity_type, company_type, has_financials, limit, offset }) => {
      try {
        const search = new URLSearchParams();
        if (keyword) search.append("keyword", keyword);
        if (commodity_type) search.append("commodity_type", commodity_type);
        if (company_type) search.append("company_type", company_type);
        if (has_financials !== undefined)
          search.append("has_financials", String(has_financials));
        if (limit !== undefined) search.append("limit", String(limit));
        if (offset !== undefined) search.append("offset", String(offset));
        const data = await getJson<MiningCompanyListResponse>(
          baseUrl,
          apiKey,
          "/mining/companies/",
          search
        );
        const qs = search.toString();
        return ok(`${baseUrl}/mining/companies/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining company detail
// ---------------------------------------------------------------------------
export function registerMiningCompanyDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-company-detail",
    "Fetch detailed profile of a mining company by slug (operation, licenses, contacts, commodity types).",
    {
      slug: z.string().min(1).describe("Mining company slug (see fetch-mining-companies)"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ slug }) => {
      try {
        const path = `/mining/companies/${encodeURIComponent(slug)}/`;
        const data = await getJson<Record<string, unknown>>(baseUrl, apiKey, path);
        return ok(`${baseUrl}${path}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining company financials
// ---------------------------------------------------------------------------
export function registerMiningCompanyFinancialsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-company-financials",
    "Fetch financials for a mining company by slug. Returns the latest year by default, or a specific year.",
    {
      slug: z.string().min(1).describe("Mining company slug (must have financials)"),
      year: z
        .number()
        .int()
        .optional()
        .describe("Financial year (defaults to latest); see available_years in response"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ slug, year }) => {
      try {
        const search = new URLSearchParams();
        if (year !== undefined) search.append("year", String(year));
        const path = `/mining/companies/financials/${encodeURIComponent(slug)}/`;
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          path,
          search
        );
        const qs = search.toString();
        return ok(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining company ownership
// ---------------------------------------------------------------------------
export function registerMiningCompanyOwnershipTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-company-ownership",
    "Fetch ownership structure (parents and subsidiaries) of a mining company by slug.",
    {
      slug: z.string().min(1).describe("Mining company slug"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ slug }) => {
      try {
        const path = `/mining/companies/ownership/${encodeURIComponent(slug)}/`;
        const data = await getJson<Record<string, unknown>>(baseUrl, apiKey, path);
        return ok(`${baseUrl}${path}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining company performance
// ---------------------------------------------------------------------------
export function registerMiningCompanyPerformanceTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-company-performance",
    "Fetch operational performance (commodity stats by year) for a mining company by slug.",
    {
      slug: z.string().min(1).describe("Mining company slug"),
      commodity_type: z
        .string()
        .optional()
        .describe("Filter by commodity type"),
      year: z
        .number()
        .int()
        .optional()
        .describe("Year (defaults to latest); see available_years in response"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ slug, commodity_type, year }) => {
      try {
        const search = new URLSearchParams();
        if (commodity_type) search.append("commodity_type", commodity_type);
        if (year !== undefined) search.append("year", String(year));
        const path = `/mining/companies/performance/${encodeURIComponent(slug)}/`;
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          path,
          search
        );
        const qs = search.toString();
        return ok(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}
