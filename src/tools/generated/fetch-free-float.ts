import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchFreeFloat(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sector?: string;
  sub_sector?: string;
  industry?: string;
  sub_industry?: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/free-float/`);
  if (params.sector !== undefined) {
    url.searchParams.append("sector", String(params.sector));
  }
  if (params.sub_sector !== undefined) {
    url.searchParams.append("sub_sector", String(params.sub_sector));
  }
  if (params.industry !== undefined) {
    url.searchParams.append("industry", String(params.industry));
  }
  if (params.sub_industry !== undefined) {
    url.searchParams.append("sub_industry", String(params.sub_industry));
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchFreeFloatTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-free-float",
    {
      description: "Returns the free float percentage for IDX-listed companies, optionally filtered by one level of the sector taxonomy. Results are ordered by `free_float` descending.\n\n<Note>Free float is calculated as the `share_percentage` of the **Public** entry in a company's major shareholders list.</Note>\n\n<Warning>Query parameters are **mutually exclusive**. Provide at most one filter parameter per request.</Warning>\n\n<Info>Costs 1 API credit per 100 companies returned, rounded up.</Info>",
      inputSchema: z.object({
      sector: z.string()
        .describe("Kebab-case sector slug. E.g. `infrastructures`, `healthcare`, `transportation-logistic`. Retrieve valid values from the [Subsectors](./helper-list/subsectors) endpoint.").optional(),
      sub_sector: z.string()
        .describe("Kebab-case subsector slug. E.g. `banks`, `basic-materials`, `food-beverage`. Retrieve valid values from the [Subsectors](./helper-list/subsectors) endpoint.").optional(),
      industry: z.string()
        .describe("Kebab-case industry slug. E.g. `oil-gas`, `electrical`, `chemicals`. Retrieve valid values from the [Industries](./helper-list/industries) endpoint.").optional(),
      sub_industry: z.string()
        .describe("Kebab-case sub-industry slug. E.g. `coal-production`, `gold`, `healthcare-providers`. Retrieve valid values from the [Subindustries](./helper-list/subindustries) endpoint.").optional(),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchFreeFloat(baseUrl, apiKey, params);
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
