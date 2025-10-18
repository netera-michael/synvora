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
};

export async function fetchShopifyOrders({ storeDomain, accessToken, sinceId }: FetchOrdersOptions) {
  const url = new URL(`https://${storeDomain}/admin/api/2023-10/orders.json`);
  url.searchParams.set("status", "any");
  url.searchParams.set("limit", "250");
  if (sinceId) {
    url.searchParams.set("since_id", sinceId);
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

export function transformShopifyOrders(orders: ShopifyOrder[]) {
  return orders.map((order) => {
    const customerName = order.customer
      ? [order.customer.first_name, order.customer.last_name].filter(Boolean).join(" ") || "Shopify Customer"
      : "Shopify Customer";

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

    return {
      externalId: String(order.id),
      orderNumber: order.name ?? `#${order.order_number}`,
      customerName,
      status: order.financial_status === "refunded" ? "Closed" : "Open",
      financialStatus: order.financial_status ? titleCase(order.financial_status) : null,
      fulfillmentStatus: order.fulfillment_status ? titleCase(order.fulfillment_status) : null,
      totalAmount: Number(order.current_total_price ?? 0),
      currency: order.currency ?? "USD",
      processedAt: new Date(order.processed_at ?? Date.now()),
      shippingCity,
      shippingCountry,
      tags,
      notes: order.note ?? null,
      lineItems: order.line_items.map((item) => ({
        productName: item.name,
        quantity: item.quantity,
        sku: item.sku ?? undefined,
        price: Number(item.price ?? 0),
        total: Number(item.price ?? 0) * item.quantity
      }))
    };
  });
}

function titleCase(value: string) {
  return value
    .split(/[_\s]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
