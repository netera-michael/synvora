import { calculateOrderAmounts } from "./product-pricing";

export const SHOPIFY_API_VERSION = "2025-10";

type ShopifyOrder = {
  id: number;
  name: string;
  order_number: number;
  processed_at: string;
  current_total_price: string;
  currency: string;
  note?: string | null;
  tags?: string;
  financial_status?: string | null;
  fulfillment_status?: string | null;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
  billing_address?: {
    city?: string | null;
    country?: string | null;
  } | null;
  shipping_address?: {
    city?: string | null;
    country?: string | null;
  } | null;
  line_items: Array<{
    id: number;
    product_id?: number | null;
    name: string;
    quantity: number;
    sku?: string | null;
    price: string;
    total_discount?: string;
  }>;
};

type FetchOrdersOptions = {
  storeDomain: string;
  accessToken: string;
  sinceId?: string;
  createdAtMin?: string; // ISO date string
  createdAtMax?: string; // ISO date string
};

export async function fetchShopifyOrders({
  storeDomain,
  accessToken,
  sinceId,
  createdAtMin,
  createdAtMax
}: FetchOrdersOptions) {
  const url = new URL(`https://${storeDomain}/admin/api/${SHOPIFY_API_VERSION}/orders.json`);
  url.searchParams.set("status", "any");
  url.searchParams.set("limit", "250");
  if (sinceId) {
    url.searchParams.set("since_id", sinceId);
  }
  if (createdAtMin) {
    url.searchParams.set("created_at_min", createdAtMin);
  }
  if (createdAtMax) {
    url.searchParams.set("created_at_max", createdAtMax);
  }

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": accessToken
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Shopify request failed: ${response.status} ${message}`);
  }

  const data = (await response.json()) as { orders: ShopifyOrder[] };
  return data.orders;
}

export async function transformShopifyOrders(orders: ShopifyOrder[], exchangeRate: number, venueId: number, shopifyStoreId?: number) {
  return Promise.all(
    orders.map(async (order) => {
      const customerName = order.customer
        ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(" ") || "No Customer"
        : "No Customer";

      const tags = order.tags
        ? order.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean)
        : [];

      const shippingCity =
        order.shipping_address?.city ?? order.billing_address?.city ?? order.customer?.last_name ?? null;
      const shippingCountry =
        order.shipping_address?.country ?? order.billing_address?.country ?? null;

      const lineItems = order.line_items.map((item) => ({
        productName: item.name,
        quantity: item.quantity,
        sku: item.sku ?? undefined,
        shopifyProductId: item.product_id ? String(item.product_id) : undefined,
        price: Number(item.price ?? 0),
        total: Number(item.price ?? 0) * item.quantity
      }));

      // Calculate EGP amounts based on product prices
      const amounts = await calculateOrderAmounts(lineItems, exchangeRate, venueId);

      return {
        externalId: String(order.id),
        shopifyStoreId,
        orderNumber: order.name ?? `#${order.order_number}`,
        customerName,
        status: order.financial_status === "refunded" ? "Closed" : "Open",
        financialStatus: order.financial_status ? titleCase(order.financial_status) : null,
        fulfillmentStatus: order.fulfillment_status ? titleCase(order.fulfillment_status) : null,
        totalAmount: amounts.totalAmount,
        originalAmount: amounts.originalAmount,
        exchangeRate: exchangeRate,
        currency: order.currency ?? "USD",
        processedAt: new Date(order.processed_at ?? Date.now()),
        shippingCity,
        shippingCountry,
        tags,
        notes: order.note ?? null,
        lineItems
      };
    })
  );
}

function titleCase(value: string) {
  return value
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
