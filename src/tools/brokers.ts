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
// /brokers/ — Broker Registry
// ---------------------------------------------------------------------------
export function registerBrokersTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-brokers",
    "List IDX brokers (registry). Optionally filter by cohort (institutional/mixed/retail/unknown) and origin (domestic/foreign).",
    {
      cohort: z
        .enum(["institutional", "mixed", "retail", "unknown"])
        .optional()
        .describe("Filter brokers by cohort"),
      origin: z
        .enum(["domestic", "foreign"])
        .optional()
        .describe("Filter brokers by origin"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/brokers/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/brokers/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /brokers/top/ — Top Brokers Daily Ranking
// ---------------------------------------------------------------------------
export function registerTopBrokersTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-top-brokers",
    "Top IDX brokers daily ranking by transaction value. Filter by cohort, origin, metric (gross/net), date and number of brokers.",
    {
      cohort: z
        .enum(["all", "institutional", "mixed", "retail", "unknown"])
        .optional()
        .describe("Filter by cohort (default all)"),
      origin: z
        .enum(["all", "domestic", "foreign"])
        .optional()
        .describe("Filter by origin (default all)"),
      metric: z
        .enum(["gross", "net"])
        .optional()
        .describe("Ranking metric: 'gross' or 'net'"),
      date: z
        .string()
        .regex(dateRegex, "Date must be in YYYY-MM-DD format")
        .optional()
        .describe("Ranking date (YYYY-MM-DD)"),
      n_brokers: z
        .number()
        .int()
        .optional()
        .describe("Number of brokers to return"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<unknown>(baseUrl, apiKey, "/brokers/top/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/brokers/top/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// /broker-activity/{broker_code}/ — Broker Activity By Code
// ---------------------------------------------------------------------------
export function registerBrokerActivityTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-broker-activity",
    "Daily trading activity for a specific broker (by broker code). Optionally filter by symbol and a date range.",
    {
      broker_code: z
        .string()
        .describe("Broker code (e.g. 'YP', 'CC')"),
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
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ broker_code, ...rest }) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const path = `/broker-activity/${encodeURIComponent(broker_code)}/`;
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
// /broker-activity/{broker_code}/top/ — Top Accumulations & Distributions
// ---------------------------------------------------------------------------
export function registerBrokerActivityTopTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-broker-activity-top",
    "Top accumulations and distributions for a specific broker (by broker code) over a date range.",
    {
      broker_code: z.string().describe("Broker code (e.g. 'YP', 'CC')"),
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
      n_brokers: z
        .number()
        .int()
        .optional()
        .describe("Number of top stocks to return"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ broker_code, ...rest }) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const path = `/broker-activity/${encodeURIComponent(broker_code)}/top/`;
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
// /broker-summary/{symbol}/ — Broker Activity Per Symbol
// ---------------------------------------------------------------------------
export function registerBrokerSummaryTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-broker-summary",
    "Broker activity summary for a specific ticker symbol. Optionally filter by broker_code and a date range.",
    {
      symbol: z.string().describe("Ticker symbol (e.g. 'BBCA.JK')"),
      broker_code: z
        .string()
        .optional()
        .describe("Filter to a single broker code (e.g. 'YP')"),
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
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ symbol, ...rest }) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const path = `/broker-summary/${encodeURIComponent(symbol)}/`;
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
// /broker-summary/{symbol}/top/ — Top Buyers and Sellers Per Symbol
// ---------------------------------------------------------------------------
export function registerBrokerSummaryTopTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-broker-summary-top",
    "Top buyers and sellers (brokers) for a specific ticker symbol over a date range. Filter by cohort, origin and number of brokers.",
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
      cohort: z
        .enum(["all", "institutional", "mixed", "retail", "unknown"])
        .optional()
        .describe("Filter by broker cohort (default all)"),
      n_brokers: z
        .number()
        .int()
        .optional()
        .describe("Number of brokers to return per side"),
      origin: z
        .enum(["all", "domestic", "foreign"])
        .optional()
        .describe("Filter by broker origin (default all)"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ symbol, ...rest }) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(rest)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const path = `/broker-summary/${encodeURIComponent(symbol)}/top/`;
        const data = await getJson<unknown>(baseUrl, apiKey, path, search);
        const qs = search.toString();
        return ok(`${baseUrl}${path}${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}
