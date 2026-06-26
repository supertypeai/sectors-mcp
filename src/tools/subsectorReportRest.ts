import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface SubsectorReport {
  sector: string;
  sub_sector: string;
  // Section keys (statistics, market_cap, stability, valuation, growth,
  // companies) are present depending on the `sections` filter.
  [key: string]: unknown;
}

export async function fetchSubsectorReport(
  baseUrl: string,
  apiKey: string | undefined,
  subSector: string,
  sections: string = "all"
): Promise<SubsectorReport> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/subsector/report/${subSector}/`);
  if (sections && sections !== "all") {
    url.searchParams.append("sections", sections);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<SubsectorReport>(response);
}

export function registerSubsectorReportRestTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-subsector-report",
    `Fetch a detailed subsector report from the Sectors v2 API, including
statistics, market cap, stability, valuation, growth, and constituent companies.`,
    {
      sub_sector: z
        .string()
        .min(1)
        .describe("Subsector slug in kebab-case (e.g. 'banks', 'food-beverage')"),
      sections: z
        .string()
        .optional()
        .default("all")
        .describe(
          "Comma-separated sections to retrieve. Available: statistics, market_cap, stability, valuation, growth, companies. Defaults to 'all'."
        ),
    },
    { readOnlyHint: true, openWorldHint: true, destructiveHint: false },
    async ({ sub_sector, sections }) => {
      try {
        const report = await fetchSubsectorReport(
          baseUrl,
          apiKey,
          sub_sector,
          sections
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/subsector/report/${sub_sector}/\n\n${JSON.stringify(
                report,
                null,
                2
              )}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
