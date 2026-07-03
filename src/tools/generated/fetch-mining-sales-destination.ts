import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchMiningSalesDestination(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  slug: string;
  year?: number;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/mining/sales-destination/${params.slug}/`);
  if (params.year !== undefined) {
    url.searchParams.append("year", String(params.year));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchMiningSalesDestinationTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-mining-sales-destination",
    "Retrieves sales destination breakdown for a specific mining company by its slug, showing revenue and volume distribution by country for a specific year. Defaults to the latest available year if none is specified.\n\n`revenue_usd` is in base USD. Volume unit is specified per country entry in `unit` (e.g., `Mt`).\n\n<Info>Costs 1 API credit.</Info>",
    {
      slug: z.string()
        .describe("The company's unique identifier slug (e.g., `adaro-energy`)."),
      year: z.number()
        .describe("The year to retrieve. Defaults to the latest available year.").optional(),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async (params) => {
      const result = await fetchMiningSalesDestination(baseUrl, apiKey, params);
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
