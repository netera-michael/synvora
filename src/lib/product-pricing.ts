import { prisma } from "@/lib/prisma";

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
 * Calculate order amounts from line items
 * @param lineItems - Array of order line items
 * @param exchangeRate - Current USD/EGP exchange rate
 * @param venueId - The venue ID to fetch products for
 * @param shopifyTotal - The native total_price from Shopify (USD)
 * @returns Object with originalAmount (EGP), baseAmount (USD), and totalAmount (USD with fee)
 */
export async function calculateOrderAmounts(
  lineItems: Array<{
    productName: string;
    quantity: number;
    sku?: string | null;
    shopifyProductId?: string | null;
  }>,
  exchangeRate: number,
  venueId: number,
  shopifyTotal: number
): Promise<{
  originalAmount: number | null;
  baseAmount: number | null;
  totalAmount: number;
}> {
  const egpAmount = await calculateEGPFromLineItems(lineItems, venueId);

  // If matching failed (egpAmount is null), use Shopify total as fallback
  if (egpAmount === null) {
    if (exchangeRate <= 0) {
      return {
        originalAmount: null,
        baseAmount: null,
        totalAmount: 0
      };
    }

    // Fallback: Deriving EGP from Shopify Total (USD)
    const fallbackEGP = shopifyTotal * exchangeRate;
    const fallbackBaseUSD = shopifyTotal;
    const fallbackTotalUSD = Number((fallbackBaseUSD * 1.035).toFixed(2));

    return {
      originalAmount: fallbackEGP,
      baseAmount: fallbackBaseUSD,
      totalAmount: fallbackTotalUSD
    };
  }

  const baseAmount = egpAmount / exchangeRate;
  const totalAmount = Number((baseAmount * 1.035).toFixed(2)); // 3.5% fee

  return {
    originalAmount: egpAmount,
    baseAmount,
    totalAmount
  };
}
