import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningTotalProduction(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  commodity_type: string;
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
  server.tool(
    "fetch-mining-total-production",
    "Returns total national production for a commodity across all years, including year-over-year percentage change. Results are ordered by year descending.\n\n<Note>Available `commodity_type` values: `Coal`, `Nickel`, `Gold`, `Copper`.</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {
      commodity_type: z.string()
        .describe("The commodity to analyze (e.g., `Coal`). Required."),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningTotalProduction(baseUrl, apiKey, params);
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
