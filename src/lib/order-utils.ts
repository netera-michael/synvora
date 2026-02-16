import { prisma } from "./prisma";

export const DEFAULT_EXCHANGE_RATE = 48.5;

export const calculateFromOriginalAmount = (
  originalAmount: number | null,
  exchangeRate: number
) => {
  if (originalAmount === null || Number.isNaN(originalAmount) || exchangeRate <= 0) {
    return {
      baseAmount: null,
      totalAmount: 0
    };
  }

  const baseAmount = originalAmount / exchangeRate;
  const totalAmount = Number((baseAmount * 1.035).toFixed(2));

  return {
    baseAmount,
    totalAmount
  };
};

export const calculatePayoutFromOrder = (order: {
  originalAmount?: number | null;
  exchangeRate?: number | null;
  totalAmount: number;
}) => {
  if (
    typeof order.originalAmount === "number" &&
    order.originalAmount >= 0 &&
    typeof order.exchangeRate === "number" &&
    order.exchangeRate > 0
  ) {
    // Payout is the base amount (Original EGP / Exchange Rate)
    return order.originalAmount / order.exchangeRate;
  }

  // Fallback: Total / 1.035 (removes the 3.5% fee)
  return order.totalAmount / 1.035;
};

export const slugify = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "venue";

export const ensureVenue = async (name: string) => {
  const safeName = name.trim() || "CICCIO";
  const slug = slugify(safeName);

  return prisma.venue.upsert({
    where: { slug },
    update: { name: safeName },
    create: { name: safeName, slug }
  });
};

export const extractOrderNumber = (orderNumber?: string | null) => {
  if (!orderNumber) {
    return undefined;
  }
  const digits = orderNumber.match(/\d+/g);
  if (!digits || digits.length === 0) {
    return undefined;
  }
  return Number(digits[digits.length - 1]);
};

export const generateNextOrderNumber = async () => {
  // Use a transaction with row-level locking to prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // Get the highest order number based on chronological order (processedAt)
    // This ensures order numbers match the chronological sequence, not import order
    const result = await tx.$queryRaw<Array<{ orderNumber: string }>>`
      SELECT "orderNumber"
      FROM "Order"
      ORDER BY "processedAt" DESC, id DESC
      LIMIT 1
      FOR UPDATE
    `;

    const lastOrder = result[0] || null;
    const lastNumeric = extractOrderNumber(lastOrder?.orderNumber);
    const nextNumeric = (lastNumeric ?? 1000) + 1;
    return `#${nextNumeric}`;
  });
};
