import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningResourcesReservesDetail(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  province: string;
  commodity_type?: string;
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
  server.tool(
    "fetch-mining-resources-reserves-detail",
    "Returns resources and reserves data for a single province, nested by year then by commodity. Each commodity entry contains the full breakdown: `exploration_target`, `total_inventory`, `resources`, `reserves`, and `unit`.\n\n<Note>Available `commodity_type` values: `Coal`, `Gold`, `Silver`, `Copper`, `Nickel`, `Cobalt`, `Tin`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      province: z.string()
        .describe("Exact province name (e.g., `Kalimantan Timur`). Case-insensitive."),
      commodity_type: z.string()
        .describe("Restrict results to a specific commodity.").optional(),
      year: z.number()
        .describe("Restrict results to a specific year.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningResourcesReservesDetail(baseUrl, apiKey, params);
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
