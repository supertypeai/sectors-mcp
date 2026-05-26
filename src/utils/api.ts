// Sectors API keys are 64-char lowercase hex strings issued by the dashboard.
// OAuth access tokens issued by api.sectors.app/oauth/token/ use a different
// format (longer, mixed case, or JWT with dots), so anything that doesn't match
// the API key shape is treated as an OAuth bearer token.
const SECTORS_API_KEY_PATTERN = /^[a-f0-9]{64}$/;

const isSectorsApiKey = (token: string): boolean =>
  SECTORS_API_KEY_PATTERN.test(token);

export const createApiHeaders = (apiKey: string | undefined) => {
  if (!apiKey) throw new Error("API key is not defined");
  return {
    Authorization: isSectorsApiKey(apiKey) ? apiKey : `Bearer ${apiKey}`,
  };
};

export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json() as T;
};

/**
 * Formats a number with appropriate units (K, M, B, T) for better readability
 * @param num The number to format
 * @param decimals Number of decimal places to show (default: 2)
 * @returns Formatted string representation of the number
 */
export const formatNumber = (
  num: number | null,
  decimals: number = 2
): string => {
  if (num === null || isNaN(num)) return "N/A";

  const absNum = Math.abs(num);

  // Format with appropriate unit
  if (absNum >= 1e12) {
    return `${(num / 1e12).toFixed(decimals)}T`;
  } else if (absNum >= 1e9) {
    return `${(num / 1e9).toFixed(decimals)}B`;
  } else if (absNum >= 1e6) {
    return `${(num / 1e6).toFixed(decimals)}M`;
  } else if (absNum >= 1e3) {
    return `${(num / 1e3).toFixed(decimals)}K`;
  }

  // For numbers less than 1000, show as is with 2 decimal places if not whole number
  return num % 1 === 0 ? num.toString() : num.toFixed(decimals);
};
