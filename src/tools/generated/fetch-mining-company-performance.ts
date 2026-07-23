import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningCompanyPerformance(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  slug: string;
  commodity_type?: "Coal" | "Copper" | "Gold" | "Nickel" | "Silver";
  year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/companies/performance/${params.slug}/`);
  if (params.commodity_type !== undefined) {
    url.searchParams.append("commodity_type", String(params.commodity_type));
  }
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningCompanyPerformanceTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-company-performance",
    "Returns production volume, sales volume, strip ratio, and resources/reserves data for a mining company for a given year. Defaults to the latest available year.\n\n<Info>Costs 1 API credit.</Info>",
    {
      slug: z.string()
        .describe("Company slug."),
      commodity_type: z.enum(["Coal", "Copper", "Gold", "Nickel", "Silver"])
        .describe("Filter by commodity. E.g. `Coal`, `Nickel`. Case-insensitive.").optional(),
      year: z.number()
        .describe("Year to retrieve. Defaults to the latest available year.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningCompanyPerformance(baseUrl, apiKey, params);
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
