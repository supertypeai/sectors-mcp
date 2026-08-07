import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningTotalProduction(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  commodity_type: "Coal" | "Copper" | "Gold" | "Nickel";
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/total-production/`);
  url.searchParams.append("commodity_type", String(params.commodity_type));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningTotalProductionTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-total-production",
    {
      description: "Returns total national production for a commodity across all years, including year-over-year percentage change. Results are ordered by year descending.\n\n<Note>Available `commodity_type` values: `Coal`, `Nickel`, `Gold`, `Copper`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      commodity_type: z.enum(["Coal", "Copper", "Gold", "Nickel"])
        .describe("The commodity to analyze (e.g., `Coal`). Required."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningTotalProduction(baseUrl, apiKey, params);
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
