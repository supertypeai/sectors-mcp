import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createApiHeaders, handleApiResponse } from "../utils/api.js";

interface FreeFloatEntry {
  symbol: string;
  company_name: string;
  free_float: number;
}

export async function fetchFreeFloat(
  baseUrl: string,
  apiKey: string | undefined,
  params: {
    sector?: string;
    sub_sector?: string;
    industry?: string;
    sub_industry?: string;
  } = {}
): Promise<FreeFloatEntry[]> {
  if (!apiKey) {
    throw new Error("SECTORS_API_KEY is not defined");
  }

  const url = new URL(`${baseUrl}/free-float/`);
  const { sector, sub_sector, industry, sub_industry } = params;

  if (sector) url.searchParams.append("sector", sector);
  if (sub_sector) url.searchParams.append("sub_sector", sub_sector);
  if (industry) url.searchParams.append("industry", industry);
  if (sub_industry) url.searchParams.append("sub_industry", sub_industry);

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: createApiHeaders(apiKey),
  });

  return handleApiResponse<FreeFloatEntry[]>(response);
}

export function registerFreeFloatTool(
  server: McpServer,
  baseUrl: string,
  apiKey: string | undefined
) {
  server.tool(
    "fetch-free-float",
    "Fetches free float data for IDX-listed stocks. Returns all stocks by default, with optional filtering by sector, sub_sector, industry, or sub_industry.",
    {
      sector: z
        .string()
        .optional()
        .describe("Filter by sector in kebab-case (e.g., financials, consumer-non-cyclicals)"),
      sub_sector: z
        .string()
        .optional()
        .describe("Filter by sub-sector in kebab-case (e.g., banks, financing-service)"),
      industry: z
        .string()
        .optional()
        .describe("Filter by industry in kebab-case (e.g., regional-banks, multi-line-insurance)"),
      sub_industry: z
        .string()
        .optional()
        .describe("Filter by sub-industry in kebab-case (e.g., conventional-banks, sharia-banks)"),
    },
    async ({ sector, sub_sector, industry, sub_industry }) => {
      try {
        const result = await fetchFreeFloat(baseUrl, apiKey, {
          sector,
          sub_sector,
          industry,
          sub_industry,
        });

        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "An unknown error occurred";

        return {
          content: [{
            type: "text" as const,
            text: errorMessage,
          }],
          isError: true,
        };
      }
    }
  );
}
