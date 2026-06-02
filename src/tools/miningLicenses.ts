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
// Mining licenses (paginated)
// ---------------------------------------------------------------------------
export function registerMiningLicensesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-licenses",
    "List mining licenses (paginated). Returns { results, pagination }. Filter by company, province, commodity_type, license_type, activity, cnc, expiring_soon.",
    {
      company: z.string().optional().describe("Filter by company slug"),
      province: z.string().optional().describe("Province (exact match)"),
      commodity_type: z.string().optional().describe("Filter by commodity type"),
      license_type: z.string().optional().describe("License type (e.g. 'IUP', 'IUPK')"),
      activity: z
        .string()
        .optional()
        .describe("Activity (e.g. 'Eksplorasi', 'Operasi Produksi')"),
      cnc: z.string().optional().describe("Clean and Clear status filter"),
      expiring_soon: z.boolean().optional().describe("Only licenses expiring soon"),
      order_by: z
        .string()
        .optional()
        .describe(
          "Sort field (prefix '-' for desc). One of: license_expiry_date, license_effective_date, licensed_area_ha, commodity_type. Default: license_expiry_date"
        ),
      limit: z.number().int().max(30).optional().describe("Per page (default 20, max 30)"),
      offset: z.number().int().optional().describe("Pagination offset (default 0)"),
    },
    { annotations: { readOnlyHint: true } },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          "/mining/licenses/",
          search
        );
        const qs = search.toString();
        return ok(`${baseUrl}/mining/licenses/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining license auctions (paginated)
// ---------------------------------------------------------------------------
export function registerMiningLicenseAuctionsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-license-auctions",
    "List mining license auctions (paginated). Returns { results, pagination }. Filter by province, commodity_type, area_type, status, participant, etc.",
    {
      province: z.string().optional().describe("Province filter"),
      commodity_type: z.string().optional().describe("Commodity type filter"),
      area_type: z.string().optional().describe("Area type filter"),
      status: z.string().optional().describe("Auction status filter"),
      participant: z.string().optional().describe("Participant name filter"),
      qualified: z
        .boolean()
        .optional()
        .describe("Only qualified entries (requires participant)"),
      min_participants: z
        .number()
        .int()
        .optional()
        .describe("Minimum participant count"),
      order_by: z
        .string()
        .optional()
        .describe(
          "Sort field (prefix '-' for desc). One of: winner_date, participant_count, licensed_area_ha, commodity_type. Default: -winner_date"
        ),
      limit: z.number().int().max(30).optional().describe("Per page (default 20, max 30)"),
      offset: z.number().int().optional().describe("Pagination offset (default 0)"),
    },
    { annotations: { readOnlyHint: true } },
    async (params) => {
      try {
        const search = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined) search.append(k, String(v));
        }
        const data = await getJson<Record<string, unknown>>(
          baseUrl,
          apiKey,
          "/mining/license-auctions/",
          search
        );
        const qs = search.toString();
        return ok(`${baseUrl}/mining/license-auctions/${qs ? `?${qs}` : ""}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Mining license auction detail
// ---------------------------------------------------------------------------
export function registerMiningLicenseAuctionDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-license-auction-detail",
    "Fetch full detail of a single mining license auction by its WIUP code (phases, participants, winner).",
    {
      wiup_code: z
        .string()
        .min(1)
        .describe("Auction WIUP code (see fetch-mining-license-auctions)"),
    },
    { annotations: { readOnlyHint: true } },
    async ({ wiup_code }) => {
      try {
        const path = `/mining/license-auctions/${encodeURIComponent(wiup_code)}/`;
        const data = await getJson<Record<string, unknown>>(baseUrl, apiKey, path);
        return ok(`${baseUrl}${path}`, data);
      } catch (error: any) {
        return err(error);
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Company sales destinations
// ---------------------------------------------------------------------------
export function registerMiningSalesDestinationTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-sales-destination",
    "Fetch a mining company's sales destinations (by country) for a year. Defaults to the latest year.",
    {
      slug: z.string().min(1).describe("Mining company slug"),
      year: z
        .number()
        .int()
        .optional()
        .describe("Year (defaults to latest available)"),
    },
    { annotations: { readOnlyHint: true } },
    async ({ slug, year }) => {
      try {
        const search = new URLSearchParams();
        if (year !== undefined) search.append("year", String(year));
        const path = `/mining/sales-destination/${encodeURIComponent(slug)}/`;
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
