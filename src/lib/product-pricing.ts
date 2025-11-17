/**
 * Product name to EGP price mapping
 * These are the ticket types sold through Shopify
 */
export const PRODUCT_PRICES: Record<string, number> = {
  "Extra Chair Ticket": 500,
  "Basic Entry Ticket": 1000,
  "Standing Entry Ticket": 2500,
  "Silver Entry Ticket": 4000,
  "Advanced Entry Ticket": 5000,
  "Golden Entry Ticket": 6000,
  "Full Entry Ticket": 10000
};

/**
 * Calculates total EGP amount from line items based on product prices
 * Returns null if any products are not found in the price mapping
 */
export function calculateEGPFromLineItems(
  lineItems: Array<{ productName: string; quantity: number }>
): number | null {
  let total = 0;
  let hasUnknownProduct = false;

  for (const item of lineItems) {
    const pricePerUnit = PRODUCT_PRICES[item.productName];

    if (pricePerUnit === undefined) {
      console.warn(`Unknown product: ${item.productName}`);
      hasUnknownProduct = true;
      continue;
    }

    total += pricePerUnit * item.quantity;
  }

  // If we found any unknown products, return null to indicate we can't calculate accurately
  if (hasUnknownProduct && total === 0) {
    return null;
  }

  return total;
}

/**
 * Calculates order amounts from line items and exchange rate
 * Applies 3.5% fee to the base USD amount
 */
export function calculateOrderAmounts(
  lineItems: Array<{ productName: string; quantity: number }>,
  exchangeRate: number
): {
  originalAmount: number | null; // EGP total
  baseAmount: number | null; // USD base (before fee)
  totalAmount: number; // USD with 3.5% fee
} {
  const egpAmount = calculateEGPFromLineItems(lineItems);

  // If we couldn't calculate EGP amount, return defaults
  if (egpAmount === null || exchangeRate <= 0) {
    return {
      originalAmount: null,
      baseAmount: null,
      totalAmount: 0
    };
  }

  // Convert EGP to USD base
  const baseAmount = egpAmount / exchangeRate;

  // Apply 3.5% fee
  const totalAmount = Number((baseAmount * 1.035).toFixed(2));

  return {
    originalAmount: egpAmount,
    baseAmount,
    totalAmount
  };
}

/**
 * Formats EGP amount with thousand separators
 */
export function formatEGP(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Gets a list of all product names
 */
export function getProductNames(): string[] {
  return Object.keys(PRODUCT_PRICES);
}

/**
 * Checks if a product name exists in the price mapping
 */
export function isKnownProduct(productName: string): boolean {
  return productName in PRODUCT_PRICES;
}

/**
 * Gets the price for a specific product
 */
export function getProductPrice(productName: string): number | null {
  return PRODUCT_PRICES[productName] ?? null;
}
