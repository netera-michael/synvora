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
    const base = order.originalAmount / order.exchangeRate;
    return base * 0.9825;
  }

  return order.totalAmount * 0.9825;
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
  const lastOrder = await prisma.order.findFirst({
    orderBy: { id: "desc" },
    select: { orderNumber: true }
  });

  const lastNumeric = extractOrderNumber(lastOrder?.orderNumber);
  const nextNumeric = (lastNumeric ?? 1000) + 1;
  return `#${nextNumeric}`;
};
