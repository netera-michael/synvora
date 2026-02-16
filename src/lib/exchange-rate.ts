import { prisma } from "./prisma";

export const DEFAULT_EXCHANGE_RATE = 48.5;
const CACHE_DURATION_HOURS = 24;

/**
 * Fetches current USD to EGP exchange rate from external API
 * Uses exchangerate-api.com free tier (1,500 requests/month)
 */
async function fetchExchangeRateFromAPI(
  from: string = "USD",
  to: string = "EGP"
): Promise<number | null> {
  // Special case: AED/USD has a fixed peg of 3.6725
  if (from === "AED" && to === "USD") return 1 / 3.6725;
  if (from === "USD" && to === "AED") return 3.6725;

  try {
    // Using exchangerate-api.com - no API key needed for basic usage
    const url = `https://api.exchangerate-api.com/v4/latest/${from}`;

    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour in Next.js
    });

    if (!response.ok) {
      console.error(`Exchange rate API returned ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.rates && data.rates[to]) {
      return data.rates[to];
    }

    console.error("Exchange rate not found in API response");
    return null;
  } catch (error) {
    console.error("Failed to fetch exchange rate from API:", error);
    return null;
  }
}

/**
 * Gets cached exchange rate from database
 */
async function getCachedRate(
  from: string = "USD",
  to: string = "EGP"
): Promise<{ rate: number; expired: boolean } | null> {
  try {
    const cached = await prisma.exchangeRate.findUnique({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: from,
          toCurrency: to
        }
      }
    });

    if (!cached) {
      return null;
    }

    const expired = new Date() > cached.expiresAt;

    return {
      rate: cached.rate,
      expired
    };
  } catch (error) {
    console.error("Failed to get cached exchange rate:", error);
    return null;
  }
}

/**
 * Saves exchange rate to database cache
 */
async function cacheExchangeRate(
  rate: number,
  from: string = "USD",
  to: string = "EGP"
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + CACHE_DURATION_HOURS * 60 * 60 * 1000);

    await prisma.exchangeRate.upsert({
      where: {
        fromCurrency_toCurrency: {
          fromCurrency: from,
          toCurrency: to
        }
      },
      create: {
        fromCurrency: from,
        toCurrency: to,
        rate,
        fetchedAt: now,
        expiresAt
      },
      update: {
        rate,
        fetchedAt: now,
        expiresAt
      }
    });
  } catch (error) {
    console.error("Failed to cache exchange rate:", error);
  }
}

/**
 * Gets current exchange rate with caching strategy:
 * 1. Check database cache
 * 2. If cached and not expired, return cached rate
 * 3. If expired or missing, fetch from API
 * 4. If API fails, return cached rate (even if expired)
 * 5. If no cache and API fails, return DEFAULT_EXCHANGE_RATE
 */
export async function getCurrentExchangeRate(
  from: string = "USD",
  to: string = "EGP"
): Promise<number> {
  // Check cache first
  const cached = await getCachedRate(from, to);

  // If we have a fresh cached rate, use it
  if (cached && !cached.expired) {
    return cached.rate;
  }

  // Try to fetch fresh rate from API
  const freshRate = await fetchExchangeRateFromAPI(from, to);

  if (freshRate) {
    // Successfully fetched, cache it
    await cacheExchangeRate(freshRate, from, to);
    return freshRate;
  }

  // API failed - use cached rate if available (even if expired)
  if (cached) {
    console.warn(`Using expired cached rate: ${cached.rate}`);
    return cached.rate;
  }

  // No cache and API failed - use default
  console.warn(`Using default exchange rate: ${DEFAULT_EXCHANGE_RATE}`);
  return DEFAULT_EXCHANGE_RATE;
}

/**
 * Gets exchange rate info including cache status
 */
export async function getExchangeRateWithInfo(
  from: string = "USD",
  to: string = "EGP"
): Promise<{
  rate: number;
  cached: boolean;
  fetchedAt: Date | null;
}> {
  const cached = await getCachedRate(from, to);

  if (cached && !cached.expired) {
    return {
      rate: cached.rate,
      cached: true,
      fetchedAt: (await prisma.exchangeRate.findUnique({
        where: {
          fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to }
        }
      }))?.fetchedAt || null
    };
  }

  const rate = await getCurrentExchangeRate(from, to);

  return {
    rate,
    cached: false,
    fetchedAt: new Date()
  };
}
