import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningResourcesReserves(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/resources-reserves/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningResourcesReservesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-resources-reserves",
    {
      description: "Discovery index showing which provinces, years, and commodities have resources and reserves data available. Use this before querying the detail endpoint to confirm data availability.\n\n<Note>This index endpoint does not accept any query parameters.</Note>\n\nUse [Resources & Reserves Detail](../sites-production/commodity-resources-reserves-detail) to retrieve actual values.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (_) => {
      const result = await fetchMiningResourcesReserves(baseUrl, apiKey, {});
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
