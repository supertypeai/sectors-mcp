import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchKlseSectors(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/klse/sectors/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchKlseSectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-klse-sectors",
    "Returns all available KLSE sector slugs as a flat array.\n\n**Used by:** [KLSE Companies](../malaysia/klse-companies), [KLSE Top Companies](../malaysia/klse-top-companies)\n\n<Info>Costs 1 API credit.</Info>",
    {},
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (_) => {
      const result = await fetchKlseSectors(baseUrl, apiKey, {});
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
