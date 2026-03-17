export type IdxTickerFormat = "withSuffix" | "withoutSuffix";

const IDX_SUFFIX = ".JK";
const IDX_TICKER_PATTERN = /^[A-Z0-9]+$/;

const getBaseIdxTicker = (ticker: string): string => {
  const normalizedTicker = ticker.trim().toUpperCase();

  if (!normalizedTicker) {
    throw new Error("IDX ticker is required");
  }

  if (normalizedTicker.endsWith(IDX_SUFFIX)) {
    const baseTicker = normalizedTicker.slice(0, -IDX_SUFFIX.length);

    if (!IDX_TICKER_PATTERN.test(baseTicker)) {
      throw new Error(
        `Invalid IDX ticker format: ${ticker}. Use a ticker like BBCA or BBCA.JK.`
      );
    }

    return baseTicker;
  }

  if (normalizedTicker.includes(".")) {
    throw new Error(
      `Invalid IDX ticker format: ${ticker}. Use a ticker like BBCA or BBCA.JK.`
    );
  }

  if (!IDX_TICKER_PATTERN.test(normalizedTicker)) {
    throw new Error(
      `Invalid IDX ticker format: ${ticker}. Use a ticker like BBCA or BBCA.JK.`
    );
  }

  return normalizedTicker;
};

export const normalizeIdxTicker = (
  ticker: string,
  format: IdxTickerFormat = "withSuffix"
): string => {
  const baseTicker = getBaseIdxTicker(ticker);

  return format === "withSuffix" ? `${baseTicker}${IDX_SUFFIX}` : baseTicker;
};

export const normalizeIdxTickers = (
  tickers: string[],
  format: IdxTickerFormat = "withSuffix"
): string[] => tickers.map((ticker) => normalizeIdxTicker(ticker, format));
