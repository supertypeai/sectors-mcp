import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface SgxCompany {
  symbol: string;
  company_name: string;
}

// Add this interface for the SGX Company Report
export interface SGXCompanyReport {
  symbol: string;
  name: string;
  overview: {
    market_cap: number;
    volume: number;
    employee_num: number;
    sector: string;
    sub_sector: string;
    change_1d: number;
    change_7d: number;
    change_1m: number;
    change_1y: number;
    change_3y: number;
    change_ytd: number;
    all_time_price: {
      ytd_low: { date: string; price: number };
      '52_w_low': { date: string; price: number };
      '90_d_low': { date: string; price: number };
      ytd_high: { date: string; price: number };
      '52_w_high': { date: string; price: number };
      '90_d_high': { date: string; price: number };
      all_time_low: { date: string; price: number };
      all_time_high: { date: string; price: number };
    };
  };
  valuation: {
    pe: number;
    ps: number;
    pcf: number;
    pb: number;
  };
  financials: {
    historical_earnings: {
      ttm: number;
      [key: string]: number | null;
    };
    historical_revenue: {
      ttm: number;
      [key: string]: number | null;
    };
    eps: number;
    gross_margin: number;
    operating_margin: number;
    net_profit_margin: number;
    one_year_eps_growth: number;
    one_year_sales_growth: number;
    quick_ratio: number | null;
    current_ratio: number | null;
    debt_to_equity: number | null;
  };
  dividend: {
    dividend_yield_5y_avg: number;
    dividend_growth_rate: number;
    payout_ratio: number;
    forward_dividend: number;
    forward_dividend_yield: number;
    dividend_ttm: number;
    historical_dividends: Array<{
      year: number;
      breakdown: Array<{
        date: string;
        total: number;
        yield: number;
      }>;
      total_yield: number;
      total_dividend: number;
    }>;
  };
}

export interface CompanyResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
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
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(
    `${baseUrl}/companies/?sub_sector=${subSector}`,
    {
      method: "GET",
      headers: createApiHeaders(apiKey),
    }
  );

  return handleApiResponse<CompanyResponse[]>(response);
}

export async function fetchCompaniesBySubindustry(
  baseUrl: string,
  apiKey: string | undefined,
  subIndustry: string
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(
    `${baseUrl}/companies/?sub_industry=${subIndustry}`,
    {
      method: "GET",
      headers: createApiHeaders(apiKey),
    }
  );

  return handleApiResponse<CompanyResponse[]>(response);
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

  // Ensure ticker is in uppercase and remove .JK if present
  const formattedTicker = ticker.toUpperCase().replace(/\.JK$/, '');
  
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

  // Ensure ticker is in uppercase and remove .JK if present
  const formattedTicker = ticker.toUpperCase().replace(/\.JK$/, '');
  
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

  // Ensure ticker is in uppercase and remove .JK if present
  const formattedTicker = params.ticker.toUpperCase().replace(/\.JK$/, '');
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  
  if (params.financialYear) {
    queryParams.append('financial_year', params.financialYear.toString());
  }
  
  const queryString = queryParams.toString();
  const url = `${baseUrl}/company/get-segments/${formattedTicker}/` + 
              (queryString ? `?${queryString}` : '');
  
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

  // Ensure ticker is in uppercase and remove .JK if present
  const formattedTicker = params.ticker.toUpperCase().replace(/\.JK$/, '');
  
  // Build query parameters
  const queryParams = new URLSearchParams();
  
  if (params.reportDate) {
    queryParams.append('report_date', params.reportDate);
  }
  
  if (params.approx !== undefined) {
    queryParams.append('approx', params.approx.toString());
  }
  
  if (params.nQuarters !== undefined) {
    queryParams.append('n_quarters', params.nQuarters.toString());
  }
  
  const queryString = queryParams.toString();
  const url = `${baseUrl}/financials/quarterly/${formattedTicker}/` + 
              (queryString ? `?${queryString}` : '');
  
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
    "Fetch companies by subsector from the Sectors API",
    {
      subSector: z.string().describe("The subsector to fetch companies for")
    },
    async ({ subSector }) => {
      try {
        const companies = await fetchCompaniesBySubsector(baseUrl, apiKey, subSector);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/subsector/${encodeURIComponent(subSector)}/\n\n${JSON.stringify(companies, null, 2)}`
          }]
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
    "Fetch companies by subindustry from the Sectors API",
    {
      subIndustry: z.string().describe("The subindustry to fetch companies for")
    },
    async ({ subIndustry }) => {
      try {
        const companies = await fetchCompaniesBySubindustry(baseUrl, apiKey, subIndustry);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/subindustry/${encodeURIComponent(subIndustry)}/\n\n${JSON.stringify(companies, null, 2)}`
          }]
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
    async () => {
      try {
        const companies = await fetchCompaniesWithSegments(baseUrl, apiKey);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/with-segments/\n\n${JSON.stringify(companies, null, 2)}`
          }]
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
      ticker: z.string().describe("The company ticker symbol")
    },
    async ({ ticker }) => {
      try {
        const performance = await fetchListingPerformance(baseUrl, apiKey, ticker);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/${ticker}/listing-performance/\n\n${JSON.stringify(performance, null, 2)}`
          }]
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
      ticker: z.string().describe("The company ticker symbol")
    },
    async ({ ticker }) => {
      try {
        const dates = await fetchQuarterlyFinancialDates(baseUrl, apiKey, ticker);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/${ticker}/quarterly-financial-dates/\n\n${JSON.stringify(dates, null, 2)}`
          }]
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
      ticker: z.string().describe("The company ticker symbol"),
      reportDate: z.string().optional().describe("Specific report date (YYYY-MM-DD)"),
      approx: z.boolean().optional().describe("Whether to include approximate data"),
      nQuarters: z.number().optional().describe("Number of quarters to fetch")
    },
    async ({ ticker, reportDate, approx, nQuarters }) => {
      try {
        const financials = await fetchQuarterlyFinancials(baseUrl, apiKey, {
          ticker,
          reportDate,
          approx,
          nQuarters
        });
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/${ticker}/quarterly-financials/\n\n${JSON.stringify(financials, null, 2)}`
          }]
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}

export async function fetchSGXCompanyReport(
  baseUrl: string,
  apiKey: string | undefined,
  ticker: string
): Promise<SGXCompanyReport> {
  const url = new URL(`/sgx/company/report/${ticker}`, baseUrl);
  const headers = createApiHeaders(apiKey);

  const response = await fetch(url.toString(), { headers });
  return handleApiResponse<SGXCompanyReport>(response);
}

export function registerSGXCompanyReportTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    'fetch-sgx-company-report',
    'Fetch a comprehensive report for a given SGX-listed company ticker, including overview, valuation, financials, and dividend information.',
    {
      ticker: z.string().describe('The ticker symbol of the company (e.g., "D05", "U11")')
    },
    async ({ ticker }) => {
      try {
        const report = await fetchSGXCompanyReport(baseUrl, apiKey, ticker);
        return {
          content: [{
            type: 'text',
            text: `API URL: ${baseUrl}/sgx/company/report/${ticker}/\n\n${JSON.stringify(report, null, 2)}`
          }]
        };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `Error: ${error.message}` }] };
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
      errorData.error || `Failed to fetch SGX companies for sector: ${sector}`
    );
  }

  return response.json();
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
      sector: z.string().describe("Sector in kebab-case format (e.g., 'consumer-defensive', 'industrials')")
    },
    async ({ sector }) => {
      try {
        const companies = await fetchSgxCompaniesBySector(baseUrl, apiKey, sector);
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/sgx/companies/?sector=${encodeURIComponent(sector)}\n\n${JSON.stringify(companies, null, 2)}`
          }]
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
      ticker: z.string().describe("The company ticker symbol"),
      financialYear: z.number().optional().describe("Financial year (e.g., 2023)")
    },
    async ({ ticker, financialYear }) => {
      try {
        const segments = await fetchCompanySegments(baseUrl, apiKey, {
          ticker,
          financialYear
        });
        return {
          content: [{
            type: "text",
            text: `API URL: ${baseUrl}/companies/${ticker}/segments/\n\n${JSON.stringify(segments, null, 2)}`
          }]
        };
      } catch (error: any) {
        return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      }
    }
  );
}
