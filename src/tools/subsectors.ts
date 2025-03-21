import { SubsectorResponse } from "../types/api.js";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

export async function getSubsectors(
  baseUrl: string,
  apiKey: string | undefined
) {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY not found");
  }

  const response = await fetch(`${baseUrl}/subsectors/`, {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  const data = await handleApiResponse<SubsectorResponse[]>(response);
  return data
    .map((item) => `• Sector : ${item.sector}, Subsector : ${item.subsector}`)
    .join("\n");
}
