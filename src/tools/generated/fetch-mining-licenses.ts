import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningLicenses(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  province?: string;
  commodity_type?: string;
  company?: string;
  order_by?: "-commodity_type" | "-license_effective_date" | "-license_expiry_date" | "-licensed_area_ha" | "commodity_type" | "license_effective_date" | "license_expiry_date" | "licensed_area_ha";
  limit?: number;
  offset?: number;
  expiring_soon?: boolean;
  license_type?: string;
  activity?: string;
  cnc?: boolean;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/licenses/`);
  if (params.province !== undefined) {
    url.searchParams.append("province", String(params.province));
  }
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.company !== undefined) {
    url.searchParams.append("company", String(params.company));
  }
  if (params.order_by !== undefined) {
    url.searchParams.append("order_by", String(params.order_by));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }
  if (params.expiring_soon !== undefined) {
    url.searchParams.append("expiring_soon", String(params.expiring_soon));
  }
  if (params.license_type !== undefined) {
    url.searchParams.append("license_type", String(params.license_type));
  }
  if (params.activity !== undefined) {
    url.searchParams.append("activity", String(params.activity));
  }
  if (params.cnc !== undefined) {
    url.searchParams.append("cnc", String(params.cnc));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningLicensesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-licenses",
    "Lists mining licenses (IUP/IUPK) from the ESDM Minerba portal with filters for status, commodity, location, and expiry date.\n\n<Note>Top `commodity_type` values: `Coal`, `Nickel`, `Non-Metallic Mineral`, `Sand/Stone/Gravel`, `Limestone`, `Gold`, `Tin`, `Iron`, `Bauxite`, `Clay`, `Copper`.</Note>\n\nPrefix `order_by` with `-` for descending order. Default sort: `license_expiry_date` (soonest expiring first).\n\n<Info>Costs 1 API credit.</Info>",
    {
      province: z.string()
        .describe("Filter by province. Exact match.").optional(),
      commodity_type: z.string()
        .describe("Filter by commodity. Case-insensitive.").optional(),
      company: z.string()
        .describe("Filter by company slug.").optional(),
      order_by: z.enum(["-commodity_type", "-license_effective_date", "-license_expiry_date", "-licensed_area_ha", "commodity_type", "license_effective_date", "license_expiry_date", "licensed_area_ha"])
        .describe("Sort field. Prefix with `-` for descending. Default: `license_expiry_date`.").optional(),
      limit: z.number()
        .describe("Number of results to return. Maximum: 30.").optional(),
      offset: z.number()
        .describe("Number of results to skip.").optional(),
      expiring_soon: z.boolean()
        .describe("Set to `true` to find licenses expiring within the next 365 days.").optional(),
      license_type: z.string()
        .describe("Filter by license type (e.g., `IUP`, `IUPK`). Case-insensitive.").optional(),
      activity: z.string()
        .describe("Filter by activity stage (e.g., `Eksplorasi`, `Operasi Produksi`). Case-insensitive.").optional(),
      cnc: z.boolean()
        .describe("Filter by Clear & Clean status. Case-insensitive.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningLicenses(baseUrl, apiKey, params);
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
