import { IndustryResponse } from "../types/api.js";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export async function getIndustries(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY not found");
  }

  const response = await fetch(`${baseUrl}/industries/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  const data = await handleApiResponse<IndustryResponse[]>(response);
  return data
    .map(
      (result) =>
        `- Subsector: ${result.subsector}\n- Industry: ${result.industry}`
    )
    .join("\n");
}
