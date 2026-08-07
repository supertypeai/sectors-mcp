import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningLicenseAuctions(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  province?: "Bengkulu" | "Gorontalo" | "Kalimantan Tengah" | "Maluku Utara" | "Nusa Tenggara Barat" | "Sulawesi Selatan" | "Sulawesi Utara" | "Sumatera Selatan";
  commodity_type?: "Coal" | "Copper" | "Gold" | "Nickel";
  order_by?: "-commodity_type" | "-licensed_area_ha" | "-participant_count" | "-winner_date" | "commodity_type" | "licensed_area_ha" | "participant_count" | "winner_date";
  limit?: number;
  offset?: number;
  area_type?: "WIUP" | "WIUPK";
  status?: string;
  participant?: string;
  qualified?: boolean;
  min_participants?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/license-auctions/`);
  if (params.province !== undefined) {
    url.searchParams.append("province", String(params.province));
  }
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
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
  if (params.area_type !== undefined) {
    url.searchParams.append("area_type", String(params.area_type));
  }
  if (params.status !== undefined) {
    url.searchParams.append("status", String(params.status));
  }
  if (params.participant !== undefined) {
    url.searchParams.append("participant", String(params.participant));
  }
  if (params.qualified !== undefined) {
    url.searchParams.append("qualified", String(params.qualified));
  }
  if (params.min_participants !== undefined) {
    url.searchParams.append("min_participants", String(params.min_participants));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningLicenseAuctionsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-license-auctions",
    {
      description: "Lists mining license auctions scraped from the ESDM Minerba portal. Phases and participants are omitted from list results — use the detail endpoint for the full auction record.\n\n<Note>Available `commodity_type` values: `Nickel`, `Coal`, `Gold`, `Copper`.</Note>\n\nUse `participant` + `qualified=true` to find auctions where a specific company passed pre-qualification.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      province: z.enum(["Bengkulu", "Gorontalo", "Kalimantan Tengah", "Maluku Utara", "Nusa Tenggara Barat", "Sulawesi Selatan", "Sulawesi Utara", "Sumatera Selatan"])
        .describe("Filter by province (e.g., `Sulawesi Selatan`). Case-insensitive.").optional(),
      commodity_type: z.enum(["Coal", "Copper", "Gold", "Nickel"])
        .describe("Filter by commodity (e.g., `Nickel`, `Coal`). Case-insensitive.").optional(),
      order_by: z.enum(["-commodity_type", "-licensed_area_ha", "-participant_count", "-winner_date", "commodity_type", "licensed_area_ha", "participant_count", "winner_date"])
        .describe("Sort field. Prefix with `-` for descending. Default: `-winner_date`.").optional(),
      limit: z.number()
        .describe("Number of results to return. Maximum: 30.").optional(),
      offset: z.number()
        .describe("Number of results to skip.").optional(),
      area_type: z.enum(["WIUP", "WIUPK"])
        .describe("Filter by area type (e.g., `WIUPK`). Case-insensitive.").optional(),
      status: z.string()
        .describe("Filter by auction status (e.g., `Lelang Selesai`). Case-insensitive.").optional(),
      participant: z.string()
        .describe("Filter auctions where a company name (partial match) participated.").optional(),
      qualified: z.boolean()
        .describe("When `true`, only return auctions where the `participant` passed qualification. Requires `participant`.").optional(),
      min_participants: z.number()
        .describe("Only return auctions with at least this many participants.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningLicenseAuctions(baseUrl, apiKey, params);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );
}
