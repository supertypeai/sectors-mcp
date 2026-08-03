import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCompanyOwnership(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  slug: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/companies/ownership/${params.slug}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCompanyOwnershipTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-company-ownership",
    {
      description: "Returns the corporate ownership tree for a mining company — showing parent companies (who owns it) and subsidiaries (what it owns) with percentage stakes.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      slug: z.string()
        .describe("Company slug."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningCompanyOwnership(baseUrl, apiKey, params);
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
