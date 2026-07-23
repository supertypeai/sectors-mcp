import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningSites(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  province?: "Aceh" | "Banten" | "Gorontalo" | "Jambi" | "Jawa Timur" | "Kalimantan Selatan" | "Kalimantan Tengah" | "Kalimantan Timur" | "Kalimantan Utara" | "Maluku" | "Maluku Utara" | "Nusa Tenggara Barat" | "Papua" | "Papua Barat" | "Sulawesi Barat" | "Sulawesi Selatan" | "Sulawesi Tengah" | "Sulawesi Tenggara" | "Sulawesi Utara" | "Sumatera Barat" | "Sumatera Selatan" | "Sumatera Utara";
  commodity_type?: "Coal" | "Copper" | "Gold" | "Nickel";
  company?: string;
  year?: number;
  order_by?: "-production_volume" | "-strip_ratio" | "-year" | "production_volume" | "strip_ratio" | "year";
  min_production?: number;
  limit?: number;
  offset?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/sites/`);
  if (params.province !== undefined) {
    url.searchParams.append("province", String(params.province));
  }
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.company !== undefined) {
    url.searchParams.append("company", String(params.company));
  }
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }
  if (params.order_by !== undefined) {
    url.searchParams.append("order_by", String(params.order_by));
  }
  if (params.min_production !== undefined) {
    url.searchParams.append("min_production", String(params.min_production));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    url.searchParams.append("offset", String(params.offset));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningSitesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-sites",
    "Lists mining sites with advanced filtering for location, commodity type, and production volume, plus sorting capabilities and detailed site information.\n\n<Note>Available `commodity_type` values: `Coal`, `Gold`, `Nickel`, `Copper`.</Note>\n\nPrefix `order_by` with `-` for descending order (e.g. `-production_volume`).\n\n<Info>Costs 1 API credit.</Info>",
    {
      province: z.enum(["Aceh", "Banten", "Gorontalo", "Jambi", "Jawa Timur", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara", "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Papua", "Papua Barat", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara", "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara"])
        .describe("Filter by exact province name (e.g., `Kalimantan Timur`).").optional(),
      commodity_type: z.enum(["Coal", "Copper", "Gold", "Nickel"])
        .describe("Filter by commodity type. Case-insensitive.").optional(),
      company: z.string()
        .describe("Filter by company slug.").optional(),
      year: z.number()
        .describe("Filter by reporting year.").optional(),
      order_by: z.enum(["-production_volume", "-strip_ratio", "-year", "production_volume", "strip_ratio", "year"])
        .describe("Sort field. Prefix with `-` for descending. Default: `-year`.").optional(),
      min_production: z.number()
        .describe("Filter for sites with `production_volume` ≥ this value.").optional(),
      limit: z.number()
        .describe("Number of results to return. Maximum: 30.").optional(),
      offset: z.number()
        .describe("Number of results to skip.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningSites(baseUrl, apiKey, params);
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
