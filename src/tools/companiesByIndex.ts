import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface Company {
  symbol: string;
  company_name: string;
}

export async function fetchCompaniesByIndex(
  baseUrl: string,
  apiKey: string | undefined,
  index: string
): Promise<Company[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/index/${index}/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<Company[]>(response);
}

// Available index types for TypeScript type checking
export type IndexType =
  | 'ftse'
  | 'idx30'
  | 'idxbumn20'
  | 'idxesgl'
  | 'idxg30'
  | 'idxhidiv20'
  | 'idxq30'
  | 'idxv30'
  | 'jii70'
  | 'kompas100'
  | 'lq45'
  | 'sminfra18'
  | 'srikehati'
  | 'economic30'
  | 'idxvesta28';
