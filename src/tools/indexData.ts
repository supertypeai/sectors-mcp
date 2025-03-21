import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export interface IndexResponse {
  // Add appropriate interface properties based on the API response
  [key: string]: any;
}

export async function fetchIndex(
  baseUrl: string,
  apiKey: string | undefined,
  index: string
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const response = await fetch(`${baseUrl}/index/${index}/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<IndexResponse>(response);
}
