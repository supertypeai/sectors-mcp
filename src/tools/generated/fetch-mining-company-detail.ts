import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCompanyDetail(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  slug: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/companies/${params.slug}/`);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCompanyDetailTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-company-detail",
    "Returns comprehensive operational details for a single mining company including activities, commodity types, licenses, contracts, and site count.\n\n<Info>Costs 1 API credit.</Info>",
    {
      slug: z.string()
        .describe("Company slug. Get valid slugs from the [Mining Companies List](./mining-companies) endpoint."),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningCompanyDetail(baseUrl, apiKey, params);
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
