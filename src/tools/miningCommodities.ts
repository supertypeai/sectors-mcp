import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

// All commodities-trade list endpoints return bare arrays of item objects.
export type MiningArrayResponse = Array<Record<string, unknown>>;

async function getJson(
  baseUrl: string,
  apiKey: string | undefined,
  path: string,
  search?: URLSearchParams
): Promise<MiningArrayResponse> {
  if (!apiKey) throw new Error("SECTORS_API_KEY is not defined");
  const url = new URL(`${baseUrl}${path}`);
  if (search) url.search = search.toString();
  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<MiningArrayResponse>(response);
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
// List commodities
// ---------------------------------------------------------------------------
export function registerMiningCommoditiesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-commodities",
    "List available mining commodities with their data coverage (data points, earliest/latest date).",
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async () => {
      try {
        const data = await getJson(baseUrl, apiKey, "/mining/commodities/");
        return ok(`${baseUrl}/mining/commodities/`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Commodity price history
// ---------------------------------------------------------------------------
export function registerMiningCommodityPriceTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-commodity-price",
    "Fetch historical price (USD/ton) for a commodity. Year range max 3 years; defaults to the last ~3 years.",
    {
      commodity_name: z
        .string()
        .min(1)
        .describe("Commodity name (e.g. 'Gold', 'Coal'); see fetch-mining-commodities"),
      start_year: z
        .number()
        .int()
        .optional()
        .describe("Start year (defaults to current year minus 2)"),
      end_year: z
        .number()
        .int()
        .optional()
        .describe("End year (defaults to current year)"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ commodity_name, start_year, end_year }) => {
      try {
        const search = new URLSearchParams();
        if (start_year !== undefined) search.append("start_year", String(start_year));
        if (end_year !== undefined) search.append("end_year", String(end_year));
        const path = `/mining/commodities/${encodeURIComponent(commodity_name)}/price/`;
        const data = await getJson(baseUrl, apiKey, path, search);
        return ok(`${baseUrl}${path}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Export destinations
// ---------------------------------------------------------------------------
export function registerMiningExportsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-exports",
    "Fetch top export destinations for a commodity in a given year. Both commodity_type and year are required.",
    {
      commodity_type: z
        .string()
        .min(1)
        .describe("Commodity type (e.g. 'coal', 'nickel')"),
      year: z.number().int().describe("Year (required)"),
      limit: z
        .number()
        .int()
        .max(30)
        .optional()
        .describe("Number of destinations to return (default 20, max 30)"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ commodity_type, year, limit }) => {
      try {
        const search = new URLSearchParams({
          commodity_type,
          year: String(year),
        });
        if (limit !== undefined) search.append("limit", String(limit));
        const data = await getJson(baseUrl, apiKey, "/mining/exports/", search);
        return ok(`${baseUrl}/mining/exports/?${search.toString()}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Global commodity data
// ---------------------------------------------------------------------------
export function registerMiningGlobalCommodityTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-global-commodity",
    "Fetch global commodity resource/reserve and production data. At least one of commodity_type or country is required.",
    {
      commodity_type: z
        .string()
        .optional()
        .describe("Commodity type filter (required if country is omitted)"),
      country: z
        .string()
        .optional()
        .describe("Country exact match (required if commodity_type is omitted)"),
      limit: z
        .number()
        .int()
        .max(30)
        .optional()
        .describe("Number of rows to return (default 20, max 30)"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ commodity_type, country, limit }) => {
      try {
        const search = new URLSearchParams();
        if (commodity_type) search.append("commodity_type", commodity_type);
        if (country) search.append("country", country);
        if (limit !== undefined) search.append("limit", String(limit));
        const data = await getJson(
          baseUrl,
          apiKey,
          "/mining/global-commodity/",
          search
        );
        return ok(`${baseUrl}/mining/global-commodity/?${search.toString()}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining contracts
// ---------------------------------------------------------------------------
export function registerMiningContractsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-contracts",
    "List mining contracts between mine owners and contractors. Optional filters by mine_owner or contractor slug.",
    {
      mine_owner: z
        .string()
        .optional()
        .describe("Filter by mine owner slug"),
      contractor: z
        .string()
        .optional()
        .describe("Filter by contractor slug"),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ mine_owner, contractor }) => {
      try {
        const search = new URLSearchParams();
        if (mine_owner) search.append("mine_owner", mine_owner);
        if (contractor) search.append("contractor", contractor);
        const data = await getJson(baseUrl, apiKey, "/mining/contracts/", search);
        const qs = search.toString();
        return ok(`${baseUrl}/mining/contracts/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}
