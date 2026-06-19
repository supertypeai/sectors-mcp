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
// /company/corporate-actions/{symbol}/ — Corporate Actions
// ---------------------------------------------------------------------------
export function registerCorporateActionsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-corporate-actions",
    "Corporate actions (dividends, splits, bonus issues, etc.) for an IDX company by ticker symbol.",
    {
      symbol: z.string().describe("Ticker symbol (e.g. 'BBCA.JK')"),
    },
    { annotations: { readOnlyHint: true } },
    async ({ symbol }) => {
      try {
        const path = `/company/corporate-actions/${encodeURIComponent(symbol)}/`;
        const data = await getJson<unknown>(baseUrl, apiKey, path);
        return ok(`${baseUrl}${path}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /company/shareholders-composition/{symbol}/ — Shareholders Composition
// ---------------------------------------------------------------------------
export function registerShareholdersCompositionTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-shareholders-composition",
    "Shareholders composition for an IDX company by ticker symbol. Optionally pass a specific year.",
    {
      symbol: z.string().describe("Ticker symbol (e.g. 'BBCA.JK')"),
      year: z
        .number()
        .int()
        .optional()
        .describe("Year (e.g. 2024). Defaults to the latest available."),
    },
    { annotations: { readOnlyHint: true } },
    async ({ symbol, year }) => {
      try {
        const search = new URLSearchParams();
        if (year !== undefined) search.append("year", String(year));
        const path = `/company/shareholders-composition/${encodeURIComponent(symbol)}/`;
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
// /foreign-flow/{symbol}/ — Daily Net Foreign Inflow
// ---------------------------------------------------------------------------
export function registerForeignFlowTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-foreign-flow",
    "Daily net foreign inflow/outflow for an IDX company by ticker symbol over an optional date range.",
    {
      symbol: z.string().describe("Ticker symbol (e.g. 'BBCA.JK')"),
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
    { annotations: { readOnlyHint: true } },
    async ({ symbol, ...rest }) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const path = `/foreign-flow/${encodeURIComponent(symbol)}/`;
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
// /suspensions/ — Stock Suspensions (paginated)
// ---------------------------------------------------------------------------
export function registerSuspensionsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-suspensions",
    "List IDX stock suspensions (paginated). Optionally filter by symbol and a date range.",
    {
      symbol: z
        .string()
        .optional()
        .describe("Filter to a single ticker (e.g. 'BBCA.JK')"),
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
    { annotations: { readOnlyHint: true } },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/suspensions/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/suspensions/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}
