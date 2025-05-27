import { createApiHeaders, handleApiResponse } from "../utils/api.js";

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
