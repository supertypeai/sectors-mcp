import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";
import { normalizeIdxTicker } from "../utils/tickers.js";

export interface SgxCompany {
  symbol: string;
  company_name: string;
}

export interface CompanyResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
}

export interface CompanyScreenerPagination {
  total_count: number;
  showing: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_previous: boolean;
  next_offset: number | null;
  previous_offset: number | null;
}

export interface CompanyScreenerResponse {
  results: CompanyResponse[];
  pagination: CompanyScreenerPagination;
}

const SCREENER_DEFAULT_LIMIT = 200;

function buildScreenerUrl(
  baseUrl: string,
  whereClause: string,
  limit: number = SCREENER_DEFAULT_LIMIT
): string {
  const params = new URLSearchParams({
    where: whereClause,
    limit: String(limit),
  });
  return `${baseUrl}/companies/?${params.toString()}`;
}

export interface ListingPerformance {
  symbol: string;
  chg_7d: number;
  chg_30d: number;
  chg_90d: number;
  chg_365d: number;
}

export interface FinancialSectorMetrics {
  interest_income: number | null;
  interest_expense: number | null;
  net_interest_income: number | null;
  gross_loan: number | null;
  allowance_for_loans: number | null;
  net_loan: number | null;
  total_earning_assets: number | null;
  current_account: number | null;
  savings_account: number | null;
  time_deposit: number | null;
  total_deposit: number | null;
  other_interest_bearing_liabilities: number | null;
  total_cash_and_due_from_banks: number | null;
}

export interface QuarterlyFinancialData {
  symbol: string;
  date: string;
  financials_sector_metrics: FinancialSectorMetrics;
  premium_income: number | null;
  premium_expense: number | null;
  net_premium_income: number | null;
  non_interest_income: number | null;
  revenue: number | null;
  operating_expense: number | null;
  provision: number | null;
  operating_pnl: number | null;
  non_operating_income_or_loss: number | null;
  earnings_before_tax: number | null;
  tax: number | null;
  minorities: number | null;
  earnings: number | null;
  gross_profit: number | null;
  interest_expense_non_operating: number | null;
  ebit: number | null;
  ebitda: number | null;
  cost_of_revenue: number | null;
  total_assets: number | null;
  non_interest_bearing_liabilities: number | null;
  cash_only: number | null;
  total_liabilities: number | null;
  total_equity: number | null;
  total_debt: number | null;
  stockholders_equity: number | null;
  total_non_current_assets: number | null;
  current_liabilities: number | null;
  cash_and_short_term_investments: number | null;
  non_loan_assets: number | null;
  total_current_asset: number | null;
  total_non_current_liabilities: number | null;
  financing_cash_flow: number | null;
  operating_cash_flow: number | null;
  investing_cash_flow: number | null;
  net_cash_flow: number | null;
  free_cash_flow: number | null;
  realized_capital_goods_investment: number | null;
}

export interface QuarterlyFinancialDates {
  [year: string]: Array<[string, string]>; // [date, quarter]
}

export async function fetchCompaniesBySubsector(
  baseUrl: string,
  apiKey: string | undefined,
  subSector: string
): Promise<CompanyScreenerResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = buildScreenerUrl(baseUrl, `sub_sector='${subSector}'`);
  const response = await fetch(url, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<CompanyScreenerResponse>(response);
}

export async function fetchCompaniesBySubindustry(
  baseUrl: string,
  apiKey: string | undefined,
  subIndustry: string
): Promise<CompanyScreenerResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = buildScreenerUrl(baseUrl, `sub_industry='${subIndustry}'`);
  const response = await fetch(url, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<CompanyScreenerResponse>(response);
}

export async function fetchCompaniesWithSegments(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(
    `${baseUrl}/companies/list_companies_with_segments/`,
    {
      method: "GET",
      headers: createApiHeaders(apiKey),
    }
  );

  return handleApiResponse<CompanyResponse[]>(response);
}

export async function fetchListingPerformance(
  baseUrl: string,
  apiKey: string | undefined,
  ticker: string
): Promise<ListingPerformance> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const formattedTicker = normalizeIdxTicker(ticker, "withoutSuffix");

  const response = await fetch(
    `${baseUrl}/listing-performance/${formattedTicker}/`,
    {
      method: "GET",
      headers: createApiHeaders(apiKey),
    }
  );

  return handleApiResponse<ListingPerformance>(response);
}

export async function fetchQuarterlyFinancialDates(
  baseUrl: string,
  apiKey: string | undefined,
  ticker: string
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const formattedTicker = normalizeIdxTicker(ticker, "withoutSuffix");

  const response = await fetch(
    `${baseUrl}/company/get_quarterly_financial_dates/${formattedTicker}/`,
    {
      method: "GET",
      headers: createApiHeaders(apiKey),
    }
  );

  return handleApiResponse<QuarterlyFinancialDates>(response);
}

export interface QuarterlyFinancialsParams {
  ticker: string;
  reportDate?: string;
  approx?: boolean;
  nQuarters?: number;
}

export interface RevenueBreakdownData {
  value: number;
  source: string;
  target: string;
}

export interface CompanySegmentsResponse {
  symbol: string;
  financial_year: number;
  revenue_breakdown: RevenueBreakdownData[];
}

export interface CompanySegmentsParams {
  ticker: string;
  financialYear?: number;
}

export async function fetchCompanySegments(
  baseUrl: string,
  apiKey: string | undefined,
  params: CompanySegmentsParams
): Promise<CompanySegmentsResponse> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const formattedTicker = normalizeIdxTicker(params.ticker, "withoutSuffix");

  // Build query parameters
  const queryParams = new URLSearchParams();

  if (params.financialYear) {
    queryParams.append("financial_year", params.financialYear.toString());
  }

  const queryString = queryParams.toString();
  const url =
    `${baseUrl}/company/get-segments/${formattedTicker}/` +
    (queryString ? `?${queryString}` : "");

  const response = await fetch(url, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<CompanySegmentsResponse>(response);
}

export async function fetchQuarterlyFinancials(
  baseUrl: string,
  apiKey: string | undefined,
  params: QuarterlyFinancialsParams
): Promise<QuarterlyFinancialData[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const formattedTicker = normalizeIdxTicker(params.ticker, "withoutSuffix");

  // Build query parameters
  const queryParams = new URLSearchParams();

  if (params.reportDate) {
    queryParams.append("report_date", params.reportDate);
  }

  if (params.approx !== undefined) {
    queryParams.append("approx", params.approx.toString());
  }

  if (params.nQuarters !== undefined) {
    queryParams.append("n_quarters", params.nQuarters.toString());
  }

  const queryString = queryParams.toString();
  const url =
    `${baseUrl}/financials/quarterly/${formattedTicker}/` +
    (queryString ? `?${queryString}` : "");

  const response = await fetch(url, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<QuarterlyFinancialData[]>(response);
}

// Registration functions for MCP server
export function registerCompaniesBySubsectorTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-companies-by-subsector",
    `Fetch companies by subsector from the Sectors API v2 screener.
Returns { results, pagination } — up to ${SCREENER_DEFAULT_LIMIT} companies per call.
Subsector slug must be kebab-case (e.g. 'banks', 'food-beverage').`,
    {
      subSector: z
        .string()
        .describe(
          "Subsector slug in kebab-case (e.g. 'banks', 'food-beverage')"
        ),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ subSector }) => {
      try {
        const companies = await fetchCompaniesBySubsector(
          baseUrl,
          apiKey,
          subSector
        );
        const apiUrl = buildScreenerUrl(baseUrl, `sub_sector='${subSector}'`);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${apiUrl}\n\n${JSON.stringify(companies, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

export function registerCompaniesBySubindustryTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-companies-by-subindustry",
    `Fetch companies by subindustry from the Sectors API v2 screener.
Returns { results, pagination } — up to ${SCREENER_DEFAULT_LIMIT} companies per call.
Subindustry slug must be kebab-case (e.g. 'banks', 'electric-utilities').
Use fetch-subindustries to discover valid slugs.`,
    {
      subIndustry: z
        .string()
        .describe(
          "Subindustry slug in kebab-case (e.g. 'banks', 'electric-utilities')"
        ),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ subIndustry }) => {
      try {
        const companies = await fetchCompaniesBySubindustry(
          baseUrl,
          apiKey,
          subIndustry
        );
        const apiUrl = buildScreenerUrl(
          baseUrl,
          `sub_industry='${subIndustry}'`
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${apiUrl}\n\n${JSON.stringify(companies, null, 2)}`,
            },
          ],
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

export function registerCompaniesWithSegmentsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-companies-with-segments",
    "Fetch companies with segments from the Sectors API",
    {},
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async () => {
      try {
        const companies = await fetchCompaniesWithSegments(baseUrl, apiKey);
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/companies/list_companies_with_segments/\n\n${JSON.stringify(
                companies,
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

export function registerListingPerformanceTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-listing-performance",
    "Fetch listing performance for a specific company",
    {
      ticker: z
        .string()
        .min(1)
        .describe("The IDX company ticker symbol (e.g., 'BBCA' or 'BBCA.JK')"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ ticker }) => {
      try {
        const normalizedTicker = normalizeIdxTicker(ticker, "withoutSuffix");
        const performance = await fetchListingPerformance(
          baseUrl,
          apiKey,
          ticker
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/listing-performance/${normalizedTicker}/\n\n${JSON.stringify(
                performance,
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

export function registerQuarterlyFinancialDatesTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-quarterly-financial-dates",
    "Fetch quarterly financial dates for a company",
    {
      ticker: z
        .string()
        .min(1)
        .describe("The IDX company ticker symbol (e.g., 'BBCA' or 'BBCA.JK')"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ ticker }) => {
      try {
        const normalizedTicker = normalizeIdxTicker(ticker, "withoutSuffix");
        const dates = await fetchQuarterlyFinancialDates(
          baseUrl,
          apiKey,
          ticker
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/company/get_quarterly_financial_dates/${normalizedTicker}/\n\n${JSON.stringify(
                dates,
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

export function registerQuarterlyFinancialsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-quarterly-financials",
    "Fetch quarterly financials for a company",
    {
      ticker: z
        .string()
        .min(1)
        .describe("The IDX company ticker symbol (e.g., 'BBCA' or 'BBCA.JK')"),
      reportDate: z
        .string()
        .optional()
        .describe("Specific report date (YYYY-MM-DD)"),
      approx: z
        .boolean()
        .optional()
        .describe("Whether to include approximate data"),
      nQuarters: z.number().optional().describe("Number of quarters to fetch"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ ticker, reportDate, approx, nQuarters }) => {
      try {
        const normalizedTicker = normalizeIdxTicker(ticker, "withoutSuffix");
        const url = new URL(`${baseUrl}/financials/quarterly/${normalizedTicker}/`);

        if (reportDate) {
          url.searchParams.append("report_date", reportDate);
        }

        if (approx !== undefined) {
          url.searchParams.append("approx", approx.toString());
        }

        if (nQuarters !== undefined) {
          url.searchParams.append("n_quarters", nQuarters.toString());
        }

        const financials = await fetchQuarterlyFinancials(baseUrl, apiKey, {
          ticker,
          reportDate,
          approx,
          nQuarters,
        });
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${url.toString()}\n\n${JSON.stringify(
                financials,
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

export async function fetchSgxCompaniesBySector(
  baseUrl: string,
  apiKey: string | undefined,
  sector: string
): Promise<SgxCompany[]> {
  const url = new URL(`${baseUrl}/sgx/companies/`);
  url.searchParams.append("sector", sector);

  const response = await fetch(url.toString(), {
    headers: createApiHeaders(apiKey),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as any).error ||
        `Failed to fetch SGX companies for sector: ${sector}`
    );
  }

  return response.json() as Promise<SgxCompany[]>;
}

export function registerSgxCompaniesBySectorTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-sgx-companies-by-sector",
    "Fetch list of companies in SGX Index from a sector",
    {
      sector: z
        .string()
        .describe(
          "Sector in kebab-case format (e.g., 'consumer-defensive', 'industrials')"
        ),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ sector }) => {
      try {
        const companies = await fetchSgxCompaniesBySector(
          baseUrl,
          apiKey,
          sector
        );
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${baseUrl}/sgx/companies/?sector=${encodeURIComponent(
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

export function registerCompanySegmentsTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-company-segments",
    "Fetch company segments data",
    {
      ticker: z
        .string()
        .min(1)
        .describe("The IDX company ticker symbol (e.g., 'BBCA' or 'BBCA.JK')"),
      financialYear: z
        .number()
        .optional()
        .describe("Financial year (e.g., 2023)"),
    },
    { annotations: { readOnlyHint: true, openWorldHint: true, destructiveHint: false } },
    async ({ ticker, financialYear }) => {
      try {
        const normalizedTicker = normalizeIdxTicker(ticker, "withoutSuffix");
        const url = new URL(`${baseUrl}/company/get-segments/${normalizedTicker}/`);

        if (financialYear) {
          url.searchParams.append("financial_year", financialYear.toString());
        }

        const segments = await fetchCompanySegments(baseUrl, apiKey, {
          ticker,
          financialYear,
        });
        return {
          content: [
            {
              type: "text",
              text: `API URL: ${url.toString()}\n\n${JSON.stringify(
                segments,
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
