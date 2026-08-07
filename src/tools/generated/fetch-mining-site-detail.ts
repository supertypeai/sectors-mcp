import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningSiteDetail(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  slug: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/sites/${params.slug}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningSiteDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-site-detail",
    {
      description: "Returns full details for a single mining site by its slug, including parsed resources/reserves and location (with latitude and longitude).\n\nUse [Mining Sites](../sites-production/mining-sites) to discover site slugs.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      slug: z.string()
        .describe("URL-friendly identifier for the mining site."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningSiteDetail(baseUrl, apiKey, params);
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
