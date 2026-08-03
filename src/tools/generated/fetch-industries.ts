import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchIndustries(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/industries/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchIndustriesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-industries",
    {
      description: "Returns all available subsector/industry pairs as kebab-case slugs. Use these values as inputs to the `industry` parameter.\n\n**Used by:** [Companies Screener](../companies), [Free Float Market Analysis](../free-float)\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (_) => {
      const result = await fetchIndustries(baseUrl, apiKey, {});
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
