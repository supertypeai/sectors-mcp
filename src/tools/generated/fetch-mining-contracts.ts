import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningContracts(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  contractor?: string;
  mine_owner?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/contracts/`);
  if (params.contractor !== undefined) {
    url.searchParams.append("contractor", String(params.contractor));
  }
  if (params.mine_owner !== undefined) {
    url.searchParams.append("mine_owner", String(params.mine_owner));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningContractsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-contracts",
    "Returns active mining contracts linking mine owners to their service contractors. Optionally filter by owner or contractor slug.\n\n<Info>Costs 1 API credit.</Info>",
    {
      contractor: z.string()
        .describe("Filter by contractor company slug.").optional(),
      mine_owner: z.string()
        .describe("Filter by mine owner company slug.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningContracts(baseUrl, apiKey, params);
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
