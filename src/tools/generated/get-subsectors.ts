import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function getSubsectors(
  baseUrl: string,
  apiKey: string | undefined,
  params: {}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/subsectors/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerGetSubsectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "get-subsectors",
    {
      description: "Returns all available sector/subsector pairs as kebab-case slugs. Use these values as inputs to `sector` and `sub_sector` parameters.\n\n**Used by:** [Companies Screener](../companies), [Sector Report](../report/sector-report), [Free Float Market Analysis](../free-float)\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({}),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (_) => {
      const result = await getSubsectors(baseUrl, apiKey, {});
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
