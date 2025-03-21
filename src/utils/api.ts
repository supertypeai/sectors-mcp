export const createApiHeaders = (apiKey: string | undefined) => {
  if (!apiKey) throw new Error("API key is not defined");
  return {
    Authorization: apiKey,
  };
};

export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
};
