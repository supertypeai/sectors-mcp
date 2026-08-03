import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCompanyFinancials(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  slug: string;
  year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/companies/financials/${params.slug}/`);
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCompanyFinancialsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-mining-company-financials",
    {
      description: "Returns annual financial records (assets, revenue, profit with breakdowns) for a mining company. All monetary values are in USD millions. Defaults to the latest available year.\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      slug: z.string()
        .describe("Company slug."),
      year: z.number()
        .describe("Year to retrieve. Defaults to the latest available year.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchMiningCompanyFinancials(baseUrl, apiKey, params);
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
