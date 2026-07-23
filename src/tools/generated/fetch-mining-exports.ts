import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningExports(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  commodity_type: "Coal" | "Copper" | "Gold";
  year: number;
  limit?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/exports/`);
  url.searchParams.append("commodity_type", String(params.commodity_type));
  url.searchParams.append("year", String(params.year));
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningExportsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-exports",
    "Ranks countries by total export value for a given year and commodity, showing the top destinations for Indonesian commodity exports.\n\n<Note>Available `commodity_type` values: `Gold`, `Copper`, `Coal`.</Note>\n\n`export_usd` is in base USD. Volume unit is specified per row in `volume_unit` (typically `Mt`). Two volume sources are provided: **BPS** (Badan Pusat Statistik) and **ESDM** (Energi Sumber Daya Mineral) — values may differ due to methodology.\n\n<Info>Costs 1 API credit.</Info>",
    {
      commodity_type: z.enum(["Coal", "Copper", "Gold"])
        .describe("The commodity to analyze (e.g., `Gold`, `Coal`)."),
      year: z.number()
        .describe("The year to analyze export data for (e.g., `2024`)."),
      limit: z.number()
        .describe("Number of top countries to return. Maximum: 30.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningExports(baseUrl, apiKey, params);
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
