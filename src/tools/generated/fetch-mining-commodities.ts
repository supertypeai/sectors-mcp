import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCommodities(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/commodities/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCommoditiesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-commodities",
    "Lists all commodities available in the price database with coverage metadata. Use this as a discovery endpoint before querying [Commodity Price History](../commodities-trade/commodity-price) endpoint.\n\n<Note>\nMost commodities only have data in the price table. Cross-table data (production, exports, reserves, sites) is limited to: **Coal**, **Gold**, **Nickel**, **Copper** — and partially Silver, Cobalt, Bauxite.\n</Note>\n\n<Info>Costs 1 API credit.</Info>",
    {},
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (_) => {
      const result = await fetchMiningCommodities(baseUrl, apiKey, {});
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
