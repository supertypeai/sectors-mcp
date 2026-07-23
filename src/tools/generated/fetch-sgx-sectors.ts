import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxSectors(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/sectors/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxSectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-sectors",
    "Returns all available SGX sector slugs as a flat array.\n\n**Used by:** [SGX Companies](../singapore/sgx-companies), [SGX Top Companies](../singapore/sgx-top-companies)\n\n<Info>Costs 1 API credit.</Info>",
    {},
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (_) => {
      const result = await fetchSgxSectors(baseUrl, apiKey, {});
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
