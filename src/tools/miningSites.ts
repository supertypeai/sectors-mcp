import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

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
// Mining sites (paginated)
// ---------------------------------------------------------------------------
export function registerMiningSitesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-sites",
    "List mining sites (paginated). Returns { results, pagination }. Filter by company, province, commodity_type, year, min_production.",
    {
      company: z.string().optional().describe("Filter by company slug"),
      province: z.string().optional().describe("Province (exact match)"),
      commodity_type: z.string().optional().describe("Filter by commodity type"),
      year: z.number().int().optional().describe("Production year filter"),
      min_production: z
        .number()
        .optional()
        .describe("Minimum production volume filter"),
      order_by: z
        .string()
        .optional()
        .describe(
          "Sort field (prefix '-' for desc). One of: production_volume, year, strip_ratio. Default: -year"
        ),
      limit: z.number().int().max(30).optional().describe("Per page (default 20, max 30)"),
      offset: z.number().int().optional().describe("Pagination offset (default 0)"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          "/mining/sites/",
          search
        );
        const qs = search.toString();
        return ok(`${baseUrl}/mining/sites/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining site detail
// ---------------------------------------------------------------------------
export function registerMiningSiteDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-site-detail",
    "Fetch detail of a single mining site by slug (resources/reserves, location).",
    {
      slug: z.string().min(1).describe("Mining site slug (see fetch-mining-sites)"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ slug }) => {
      try {
        const path = `/mining/sites/${encodeURIComponent(slug)}/`;
        const data = await getJson<Record<string, unknown>>(baseUrl, apiKey, path);
        return ok(`${baseUrl}${path}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Total commodity production
// ---------------------------------------------------------------------------
export function registerMiningTotalProductionTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-total-production",
    "Fetch national total production history for a commodity (year-over-year volumes). commodity_type is required.",
    {
      commodity_type: z
        .string()
        .min(1)
        .describe("Commodity type (e.g. 'coal', 'nickel')"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ commodity_type }) => {
      try {
        const search = new URLSearchParams({ commodity_type });
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          "/mining/total-production/",
          search
        );
        return ok(`${baseUrl}/mining/total-production/?${search.toString()}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// National resources & reserves (index, by province)
// ---------------------------------------------------------------------------
export function registerMiningResourcesReservesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-resources-reserves",
    "Fetch national resources & reserves overview, keyed by province with available commodities/years.",
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async () => {
      try {
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          "/mining/resources-reserves/"
        );
        return ok(`${baseUrl}/mining/resources-reserves/`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

export function registerMiningResourcesReservesDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-resources-reserves-detail",
    "Fetch resources & reserves detail for a province (by year and commodity).",
    {
      province: z
        .string()
        .min(1)
        .describe("Province name (see fetch-mining-resources-reserves keys)"),
      commodity_type: z.string().optional().describe("Filter by commodity type"),
      year: z.number().int().optional().describe("Filter by year"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ province, commodity_type, year }) => {
      try {
        const search = new URLSearchParams();
        if (commodity_type) search.append("commodity_type", commodity_type);
        if (year !== undefined) search.append("year", String(year));
        const path = `/mining/resources-reserves/${encodeURIComponent(province)}/`;
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
