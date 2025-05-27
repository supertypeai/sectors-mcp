import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface TopCompany {
  symbol: string;
  company_name: string;
  [key: string]: string | number; // For dynamic properties like forward_dividend_yield, revenue, etc.
}

export interface TopCompaniesResponse {
  dividend_yield?: TopCompany[];
  revenue?: TopCompany[];
  earnings?: TopCompany[];
  market_cap?: TopCompany[];
  pe?: TopCompany[];
}

export async function fetchTopCompanies(
  baseUrl: string,
  apiKey: string | undefined,
  sector: string = "all",
  classifications: string = "all",
  minMarketCapMillion: number = 1000
): Promise<TopCompaniesResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/sgx/companies/top/`);
  const params = new URLSearchParams();
  
  if (sector && sector !== "all") {
    params.append("sector", sector);
  }
  
  if (classifications && classifications !== "all") {
    params.append("classifications", classifications);
  }
  
  params.append("min_mcap_million", minMarketCapMillion.toString());
  
  url.search = params.toString();

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<TopCompaniesResponse>(response);
}

export function registerSgxTopCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-top-companies",
    "Fetch top SGX companies based on various metrics like dividend yield, revenue, etc.",
    {
      sector: z
        .string()
        .optional()
        .default("all")
        .describe("Sector to filter by (e.g., 'consumer-defensive', 'industrials'). Defaults to 'all'."),
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe("Comma-separated list of classifications: 'dividend_yield', 'revenue', 'earnings', 'market_cap', 'pe'. Defaults to 'all'."),
      minMarketCapMillion: z
        .number()
        .optional()
        .default(1000)
        .describe("Minimum market cap in million SGD. Defaults to 1000."),
    },
    async ({ sector, classifications, minMarketCapMillion }) => {
      try {
        const result = await fetchTopCompanies(
          baseUrl,
          apiKey,
          sector,
          classifications,
          minMarketCapMillion
        );

        return {
          content: [
            {
              type: "text",
              text: `Top SGX companies:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
          _meta: {
            type: "sgx_top_companies",
            sector,
            classifications: classifications.split(",").map(c => c.trim()).filter(Boolean),
            minMarketCapMillion,
          },
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error fetching top SGX companies: ${
                error instanceof Error ? error.message : String(error)
              }`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
