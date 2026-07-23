import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningGlobalCommodity(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  commodity_type?: "Bauxite" | "Coal" | "Copper" | "Gold" | "Nickel";
  country?: string;
  limit?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/global-commodity/`);
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.country !== undefined) {
    url.searchParams.append("country", String(params.country));
  }
  if (params.limit !== undefined) {
    url.searchParams.append("limit", String(params.limit));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningGlobalCommodityTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-global-commodity",
    "Retrieves global commodity data including production, reserves, and trade information. At least one of `commodity_type` or `country` must be provided.\n\n<Note>Available `commodity_type` values: `Coal`, `Gold`, `Nickel`, `Copper`, `Bauxite`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      commodity_type: z.enum(["Bauxite", "Coal", "Copper", "Gold", "Nickel"])
        .describe("Filter by commodity type. Required if `country` not provided.").optional(),
      country: z.string()
        .describe("Filter by country (exact match, e.g., `Australia`). Required if `commodity_type` not provided.").optional(),
      limit: z.number()
        .describe("Number of results to return. Maximum: 30.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningGlobalCommodity(baseUrl, apiKey, params);
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
