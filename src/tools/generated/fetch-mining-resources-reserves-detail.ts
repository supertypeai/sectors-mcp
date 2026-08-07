import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningResourcesReservesDetail(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  province: "Aceh" | "Banten" | "Bengkulu" | "Gorontalo" | "Jambi" | "Jawa Barat" | "Jawa Tengah" | "Jawa Timur" | "Kalimantan Barat" | "Kalimantan Selatan" | "Kalimantan Tengah" | "Kalimantan Timur" | "Kalimantan Utara" | "Kepulauan Bangka Belitung" | "Kepulauan Riau" | "Lampung" | "Maluku" | "Maluku Utara" | "Nusa Tenggara Barat" | "Nusa Tenggara Timur" | "Papua" | "Papua Barat" | "Papua Barat Daya" | "Papua Tengah" | "Riau" | "Sulawesi Barat" | "Sulawesi Selatan" | "Sulawesi Tengah" | "Sulawesi Tenggara" | "Sulawesi Utara" | "Sumatera Barat" | "Sumatera Selatan" | "Sumatera Utara";
  commodity_type?: "Coal" | "Cobalt" | "Copper" | "Gold" | "Nickel" | "Silver" | "Tin";
  year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/resources-reserves/${params.province}/`);
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningResourcesReservesDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-resources-reserves-detail",
    {
      description: "Returns resources and reserves data for a single province, nested by year then by commodity. Each commodity entry contains the full breakdown: `exploration_target`, `total_inventory`, `resources`, `reserves`, and `unit`.\n\n<Note>Available `commodity_type` values: `Coal`, `Gold`, `Silver`, `Copper`, `Nickel`, `Cobalt`, `Tin`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      province: z.enum(["Aceh", "Banten", "Bengkulu", "Gorontalo", "Jambi", "Jawa Barat", "Jawa Tengah", "Jawa Timur", "Kalimantan Barat", "Kalimantan Selatan", "Kalimantan Tengah", "Kalimantan Timur", "Kalimantan Utara", "Kepulauan Bangka Belitung", "Kepulauan Riau", "Lampung", "Maluku", "Maluku Utara", "Nusa Tenggara Barat", "Nusa Tenggara Timur", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Riau", "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tengah", "Sulawesi Tenggara", "Sulawesi Utara", "Sumatera Barat", "Sumatera Selatan", "Sumatera Utara"])
        .describe("Exact province name (e.g., `Kalimantan Timur`). Case-insensitive."),
      commodity_type: z.enum(["Coal", "Cobalt", "Copper", "Gold", "Nickel", "Silver", "Tin"])
        .describe("Restrict results to a specific commodity.").optional(),
      year: z.number()
        .describe("Restrict results to a specific year.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningResourcesReservesDetail(baseUrl, apiKey, params);
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
