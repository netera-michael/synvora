import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { OrderDto } from "@/types/orders";
import { ChevronRight } from "lucide-react";

type OrderTableProps = {
  orders: OrderDto[];
  onSelect: (order: OrderDto) => void;
};

const BADGES: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-rose-100 text-rose-700",
  Fulfilled: "bg-blue-100 text-blue-700",
  Unfulfilled: "bg-slate-100 text-slate-600",
  Open: "bg-slate-100 text-slate-700",
  Closed: "bg-slate-200 text-slate-600"
};

export function OrderTable({ orders, onSelect }: OrderTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-6 py-4">
              Order
            </th>
            <th scope="col" className="px-6 py-4">
              Date
            </th>
            <th scope="col" className="px-6 py-4">
              Customer
            </th>
            <th scope="col" className="px-6 py-4">
              Total
            </th>
            <th scope="col" className="px-6 py-4">
              Payment
            </th>
            <th scope="col" className="px-6 py-4">
              Fulfillment
            </th>
            <th scope="col" className="px-6 py-4">
              Tags
            </th>
            <th scope="col" className="px-6 py-4 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-slate-50/80">
              <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                {order.orderNumber}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                {formatDate(order.processedAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-slate-700">
                <div className="flex flex-col">
                  <span>{order.customerName}</span>
                  {order.shippingCity && (
                    <span className="text-xs text-slate-400">
                      {order.shippingCity}
                      {order.shippingCountry ? `, ${order.shippingCountry}` : ""}
                    </span>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                {formatCurrency(order.totalAmount, order.currency)}
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                    BADGES[order.financialStatus ?? ""] ?? "bg-slate-100 text-slate-600"
                  )}
                >
                  {order.financialStatus ?? "—"}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                    BADGES[order.fulfillmentStatus ?? ""] ?? "bg-slate-100 text-slate-600"
                  )}
                >
                  {order.fulfillmentStatus ?? "—"}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-2">
                  {order.tags?.length ? (
                    order.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">No tags</span>
                  )}
                </div>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onSelect(order)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary"
                >
                  View
                  <ChevronRight className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-slate-900">No orders found</p>
          <p className="text-sm text-slate-500">
            Adjust your filters or connect a Shopify store to sync orders into Synvora.
          </p>
        </div>
      )}
    </div>
  );
}
