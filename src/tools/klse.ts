import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface KlseCompany {
  symbol: string;
  company_name: string;
}

export interface KlseTopCompany {
  symbol: string;
  company_name: string;
  [key: string]: string | number;
}

export interface KlseTopCompaniesResponse {
  dividend_yield?: KlseTopCompany[];
  revenue?: KlseTopCompany[];
  earnings?: KlseTopCompany[];
  market_cap?: KlseTopCompany[];
  pe?: KlseTopCompany[];
}

export interface KlseCompanyReport {
  symbol: string;
  name: string;
  // overview, valuation, financials, dividend present depending on sections.
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// KLSE Sectors
// ---------------------------------------------------------------------------
export async function fetchKlseSectors(
  baseUrl: string,
  apiKey: string | undefined
): Promise<string[]> {
  if (!apiKey) throw new Error("SECTORS_API_KEY is not defined");

  const response = await fetch(`${baseUrl}/klse/sectors/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<string[]>(response);
}

export function registerKlseSectorsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-klse-sectors",
    "Fetch the list of available KLSE (Malaysia) sector slugs.",
    { annotations: { readOnlyHint: true } },
    async () => {
      try {
        const sectors = await fetchKlseSectors(baseUrl, apiKey);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/klse/sectors/\n\n${JSON.stringify(
                sectors,
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

// ---------------------------------------------------------------------------
// KLSE Companies by sector
// ---------------------------------------------------------------------------
export async function fetchKlseCompaniesBySector(
  baseUrl: string,
  apiKey: string | undefined,
  sector: string
): Promise<KlseCompany[]> {
  if (!apiKey) throw new Error("SECTORS_API_KEY is not defined");

  const url = new URL(`${baseUrl}/klse/companies/`);
  url.searchParams.append("sector", sector);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<KlseCompany[]>(response);
}

export function registerKlseCompaniesBySectorTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-klse-companies-by-sector",
    "Fetch the list of KLSE (Malaysia) companies in a given sector. Sector is required (kebab-case; see fetch-klse-sectors).",
    {
      sector: z
        .string()
        .min(1)
        .describe("KLSE sector slug in kebab-case (e.g. 'finance', 'energy')"),
    },
    { annotations: { readOnlyHint: true } },
    async ({ sector }) => {
      try {
        const companies = await fetchKlseCompaniesBySector(
          baseUrl,
          apiKey,
          sector
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/klse/companies/?sector=${encodeURIComponent(
                sector
              )}\n\n${JSON.stringify(companies, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// KLSE Top companies
// ---------------------------------------------------------------------------
export async function fetchKlseTopCompanies(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    sector?: string;
    classifications?: string;
    n_stock?: number;
    min_mcap_million?: number;
  } = {}
): Promise<KlseTopCompaniesResponse> {
  if (!apiKey) throw new Error("SECTORS_API_KEY is not defined");

  const { sector = "all", classifications = "all", n_stock, min_mcap_million } =
    params;

  const url = new URL(`${baseUrl}/klse/companies/top/`);
  if (sector && sector !== "all") url.searchParams.append("sector", sector);
  if (classifications && classifications !== "all")
    url.searchParams.append("classifications", classifications);
  if (n_stock !== undefined)
    url.searchParams.append("n_stock", String(n_stock));
  if (min_mcap_million !== undefined)
    url.searchParams.append("min_mcap_million", String(min_mcap_million));

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<KlseTopCompaniesResponse>(response);
}

export function registerKlseTopCompaniesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-klse-top-companies",
    "Fetch top KLSE (Malaysia) companies ranked by metrics (dividend_yield, revenue, earnings, market_cap, pe).",
    {
      sector: z
        .string()
        .optional()
        .default("all")
        .describe("KLSE sector slug in kebab-case, or 'all' (default)"),
      classifications: z
        .string()
        .optional()
        .default("all")
        .describe(
          "Comma-separated metrics: dividend_yield, revenue, earnings, market_cap, pe. Defaults to 'all'."
        ),
      n_stock: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe("Number of stocks to return per classification"),
      min_mcap_million: z
        .number()
        .optional()
        .default(1000)
        .describe("Minimum market cap in million MYR. Defaults to 1000."),
    },
    { annotations: { readOnlyHint: true } },
    async ({ sector, classifications, n_stock, min_mcap_million }) => {
      try {
        const result = await fetchKlseTopCompanies(baseUrl, apiKey, {
          sector,
          classifications,
          n_stock,
          min_mcap_million,
        });
        return {
          content: [
            {
              type: "text",
              text: `Top KLSE companies:\n\n${JSON.stringify(result, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

// ---------------------------------------------------------------------------
// KLSE Company report
// ---------------------------------------------------------------------------
export async function fetchKlseCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  symbol: string,
  sections: string = "all"
): Promise<KlseCompanyReport> {
  if (!apiKey) throw new Error("SECTORS_API_KEY is not defined");

  const url = new URL(`${baseUrl}/klse/company/report/${symbol}/`);
  if (sections && sections !== "all") {
    url.searchParams.append("sections", sections);
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });
  return handleApiResponse<KlseCompanyReport>(response);
}

export function registerKlseCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-klse-company-report",
    "Fetch a report for a KLSE (Malaysia) company by its 4-digit ticker, including overview, valuation, financials, and dividend.",
    {
      symbol: z
        .string()
        .min(1)
        .describe("KLSE company ticker (4-digit numeric, e.g. '1155')"),
      sections: z
        .string()
        .optional()
        .default("all")
        .describe(
          "Comma-separated sections: overview, valuation, financials, dividend. Defaults to 'all'."
        ),
    },
    { annotations: { readOnlyHint: true } },
    async ({ symbol, sections }) => {
      try {
        const report = await fetchKlseCompanyReport(
          baseUrl,
          apiKey,
          symbol,
          sections
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/klse/company/report/${symbol}/\n\n${JSON.stringify(
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
