export type OrderLineItemDto = {
  id: number;
  productName: string;
  quantity: number;
  sku?: string | null;
  price: number;
  total: number;
};

export type OrderDto = {
  id: number;
  externalId?: string | null;
  orderNumber: string;
  customerName: string;
  status: string;
  financialStatus?: string | null;
  fulfillmentStatus?: string | null;
  totalAmount: number;
  currency: string;
  processedAt: string;
  shippingCity?: string | null;
  shippingCountry?: string | null;
  tags: string[];
  notes?: string | null;
  source: string;
  lineItems: OrderLineItemDto[];
  shopifyStoreId?: number | null;
};
