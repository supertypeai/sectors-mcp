import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../../utils/api.js";

export async function fetchKlseCompaniesBySector(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
  sector: string;
}
): Promise<any> {
  if (!apiKey) throw new Error("SECTORS_API_KEY not found");

  const url = new URL(`${baseUrl}/klse/companies/`);
  url.searchParams.append("sector", String(params.sector));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse(response);
}

export function registerFetchKlseCompaniesBySectorTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.registerTool(
    "fetch-klse-companies-by-sector",
    {
      description: "Returns all KLSE-listed companies in a given sector as `symbol` + `company_name` pairs.\n\n<Note>Get valid sector slugs from the [KLSE Sectors](../malaysia/klse-sectors) endpoint. Format: **kebab-case** (lowercase, hyphen-separated). E.g. `financials`, `healthcare`, `consumer-cyclicals`.</Note>\n\n**Used by:** [KLSE Company Report](../malaysia/klse-report)\n\n<Info>Costs 1 API credit.</Info>",
      inputSchema: z.object({
      sector: z.string()
        .describe("Kebab-case sector slug. E.g. `financials`, `healthcare`. Get valid values from the [KLSE Sectors](../malaysia/klse-sectors) endpoint."),
      }),
      annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    },
    async (params) => {
      const result = await fetchKlseCompaniesBySector(baseUrl, apiKey, params);
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
