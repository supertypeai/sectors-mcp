import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface CompanyResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
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
