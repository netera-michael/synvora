import { prisma } from "@/lib/prisma";
import { PLATFORM_FEE_MULTIPLIER, CLIENT_COMMISSION_RATE, AED_USD_PEG } from "@/lib/constants";

export { PLATFORM_FEE_MULTIPLIER, CLIENT_COMMISSION_RATE, AED_USD_PEG };

/**
 * Core payout formula:
 *   aedBase    = EGP / aedEgpRate
 *   revenueUSD = (aedBase / AED_USD_PEG) * 1.035   — shown in Synvora as "Total order value"
 *   payoutAED  = aedBase * 0.9825                   — what the client receives
 */
export function calculateAmountsFromEGP(
  egpAmount: number,
  aedEgpRate: number
): { revenueUSD: number; payoutAED: number; aedBase: number } {
  const aedBase = egpAmount / aedEgpRate;
  const revenueUSD = Number(((aedBase / AED_USD_PEG) * PLATFORM_FEE_MULTIPLIER).toFixed(2));
  const payoutAED = Number((aedBase * (1 - CLIENT_COMMISSION_RATE)).toFixed(2));
  return { revenueUSD, payoutAED, aedBase };
}

export const formatEGP = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Calculate EGP amount from line items using database product prices
 * @param lineItems - Array of order line items with SKU or product ID
 * @param venueId - The venue ID to fetch products for
 * @returns Total EGP amount or null if any product is not found
 */
export async function calculateEGPFromLineItems(
  lineItems: Array<{
    productName: string;
    quantity: number;
    sku?: string | null;
    shopifyProductId?: string | null;
  }>,
  venueId: number
): Promise<number | null> {
  if (!lineItems.length) {
    return 0;
  }

  // Fetch all products for this venue
  const products = await prisma.product.findMany({
    where: {
      venueId,
      active: true
    }
  });

  if (!products.length) {
    console.warn(`[Product Matching] ⚠️ No active products found for venue ${venueId}. Pricing calculations will fail.`);
    return null;
  }

  let totalEGP = 0;
  const unmatchedItems: string[] = [];

  for (const item of lineItems) {
    let matchedProduct = null;

    // 1. Try to match by Shopify ID first (now contains Variant ID - most precise)
    if (item.shopifyProductId) {
      matchedProduct = products.find((p) => p.shopifyProductId === item.shopifyProductId);
    }

    // 2. Try to match by SKU if not matched yet
    if (!matchedProduct && item.sku) {
      const normalizedSku = item.sku.trim();
      matchedProduct = products.find((p) => p.sku === normalizedSku);
    }

    // 3. Try to match by product name (case-insensitive, trimmed)
    if (!matchedProduct) {
      const normalizedName = item.productName.toLowerCase().trim();
      matchedProduct = products.find(
        (p) => p.name.toLowerCase().trim() === normalizedName
      );
    }

    if (matchedProduct) {
      totalEGP += matchedProduct.egpPrice * item.quantity;
    } else {
      console.error(`[Product Matching] ✗ NO MATCH for: ${item.productName} (SKU: ${item.sku || "N/A"}, Shopify ID: ${item.shopifyProductId || "N/A"})`);
      unmatchedItems.push(
        `${item.productName} (SKU: ${item.sku || "N/A"}, ID: ${item.shopifyProductId || "N/A"})`
      );
    }
  }

  // If any items couldn't be matched, return null to indicate incomplete calculation
  if (unmatchedItems.length > 0) {
    console.error(
      `[Product Matching] FAILED: Could not match ${unmatchedItems.length} product(s) for venue ${venueId}:`,
      unmatchedItems
    );
    return null;
  }

  return totalEGP;
}

/**
 * Calculate order amounts from line items.
 * When aedEgpRate is provided (set during import review), full calculation is performed.
 * When not provided (fetch preview before rate is known), only EGP is resolved.
 *
 * @param lineItems     - Order line items
 * @param venueId       - Venue to look up product EGP prices for
 * @param shopifyUSD    - The total_price from Shopify in USD (used as custom-sale fallback)
 * @param aedEgpRate    - Daily AED/EGP rate set by admin (optional at fetch time)
 * @returns originalAmount (EGP), totalAmount (USD revenue), aedEgpRate used
 */
export async function calculateOrderAmounts(
  lineItems: Array<{
    productName: string;
    quantity: number;
    sku?: string | null;
    shopifyProductId?: string | null;
  }>,
  venueId: number,
  shopifyUSD: number,
  aedEgpRate?: number
): Promise<{
  originalAmount: number | null;
  totalAmount: number;
}> {
  const egpAmount = await calculateEGPFromLineItems(lineItems, venueId);

  // EGP resolved from product catalog
  if (egpAmount !== null) {
    if (!aedEgpRate) {
      // Rate not yet known (fetch preview) — return EGP only, amounts calculated in dialog
      return { originalAmount: egpAmount, totalAmount: 0 };
    }
    const { revenueUSD } = calculateAmountsFromEGP(egpAmount, aedEgpRate);
    return { originalAmount: egpAmount, totalAmount: revenueUSD };
  }

  // Custom sale — no product match
  if (!aedEgpRate) {
    // Rate not yet known — mark as needing manual EGP entry
    return { originalAmount: null, totalAmount: 0 };
  }

  // Derive EGP from Shopify USD: USD → AED (peg) → EGP (daily rate)
  const derivedEGP = Number((shopifyUSD * AED_USD_PEG * aedEgpRate).toFixed(2));
  const { revenueUSD } = calculateAmountsFromEGP(derivedEGP, aedEgpRate);
  return { originalAmount: derivedEGP, totalAmount: revenueUSD };
}
