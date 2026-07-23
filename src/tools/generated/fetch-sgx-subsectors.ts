import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchSgxSubsectors(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/sgx/subsectors/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchSgxSubsectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-subsectors",
    "Returns all available SGX sector/subsector pairs as kebab-case slugs. Use these values as inputs to `sector` and `sub_sector` parameters.\n\n**Used by:** [SGX Companies](../singapore/sgx-companies)\n\n<Info>Costs 1 API credit.</Info>",
    {},
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (_) => {
      const result = await fetchSgxSubsectors(baseUrl, apiKey, {});
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
