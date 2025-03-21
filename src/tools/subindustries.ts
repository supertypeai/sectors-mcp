import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface SubindustryResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
}

export async function fetchSubIndustries(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/subindustries/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<SubindustryResponse[]>(response);
}
