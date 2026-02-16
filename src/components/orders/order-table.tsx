import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { OrderDto } from "@/types/orders";
import { Edit, Copy, Trash2, MoreVertical } from "lucide-react";
import { Menu, Transition } from "@headlessui/react";
import { Fragment } from "react";

type OrderTableProps = {
  orders: OrderDto[];
  onSelect: (order: OrderDto) => void;
  onDuplicate?: (order: OrderDto) => void;
  onEdit?: (order: OrderDto) => void;
  onDelete?: (order: OrderDto) => void;
  canManage?: boolean;
  isAdmin?: boolean;
  editMode?: boolean;
  selectedOrders?: Set<number>;
  onToggleSelect?: (orderId: number, event: React.MouseEvent) => void;
  onToggleSelectAll?: () => void;
  isLoading?: boolean;
};

const BADGES: Record<string, string> = {
  Paid: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Refunded: "bg-rose-100 text-rose-700",
  Fulfilled: "bg-blue-100 text-blue-700",
  Unfulfilled: "bg-slate-100 text-synvora-text-secondary",
  Open: "bg-slate-100 text-synvora-text",
  Closed: "bg-slate-200 text-synvora-text-secondary"
};

export function OrderTable({
  orders,
  onSelect,
  onDuplicate,
  onEdit,
  onDelete,
  canManage = true,
  isAdmin = false,
  editMode = false,
  selectedOrders = new Set(),
  onToggleSelect,
  onToggleSelectAll,
  isLoading = false
}: OrderTableProps) {
  const allSelected = editMode && orders.length > 0 && orders.every(order => selectedOrders.has(order.id));
  const someSelected = editMode && orders.some(order => selectedOrders.has(order.id));

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-synvora-border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-synvora-border text-sm">
          <thead className="bg-synvora-surface-active text-left text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary">
            <tr>
              <th scope="col" className="px-6 py-4">Order</th>
              {isAdmin && <th scope="col" className="px-6 py-4">Shopify Order</th>}
              <th scope="col" className="px-6 py-4">Customer</th>
              <th scope="col" className="px-6 py-4">Venue</th>
              <th scope="col" className="px-6 py-4">Total</th>
              <th scope="col" className="px-6 py-4">Payment</th>
              <th scope="col" className="px-6 py-4">Payout amount</th>
              <th scope="col" className="px-6 py-4">Tickets value</th>
              <th scope="col" className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                {isAdmin && <td className="px-6 py-4"><Skeleton className="h-5 w-20" /></td>}
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-24" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                <td className="px-6 py-4"><Skeleton className="h-5 w-16" /></td>
                <td className="px-6 py-4"><Skeleton className="ml-auto h-8 w-8" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-synvora-border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-synvora-border text-sm">
        <thead className="bg-synvora-surface-active text-left text-xs font-semibold uppercase tracking-wide text-synvora-text-secondary [&_tr:first-child_th:first-child]:rounded-tl-2xl [&_tr:first-child_th:last-child]:rounded-tr-2xl">
          <tr>
            {editMode && (
              <th scope="col" className="px-6 py-4 w-12">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someSelected && !allSelected;
                  }}
                  onChange={onToggleSelectAll}
                  className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                />
              </th>
            )}
            <th scope="col" className="px-6 py-4">
              Order
            </th>
            {isAdmin && (
              <th scope="col" className="px-6 py-4">
                Shopify Order
              </th>
            )}
            <th scope="col" className="px-6 py-4">
              Customer
            </th>
            <th scope="col" className="px-6 py-4">
              Venue
            </th>
            <th scope="col" className="px-6 py-4">
              Total
            </th>
            <th scope="col" className="px-6 py-4">
              Payment
            </th>
            <th scope="col" className="px-6 py-4">
              Payout amount
            </th>
            <th scope="col" className="px-6 py-4">
              Tickets value
            </th>
            <th scope="col" className="px-6 py-4 text-right print:hidden">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white [&_tr:last-child_td:first-child]:rounded-bl-2xl [&_tr:last-child_td:last-child]:rounded-br-2xl">
          {orders.map((order) => {
            const payoutBase =
              typeof order.originalAmount === "number" && order.originalAmount >= 0 && typeof order.exchangeRate === "number" && order.exchangeRate > 0
                ? order.originalAmount / order.exchangeRate
                : order.totalAmount;
            const payoutValue = Number.isFinite(payoutBase)
              ? Number((payoutBase * 0.9825).toFixed(2))
              : 0;

            const isSelected = editMode && selectedOrders.has(order.id);

            return (
              <tr
                key={order.id}
                className={`hover:bg-synvora-surface-active/80 ${isSelected ? "bg-synvora-primary/5" : ""}`}
                onClick={editMode ? (e) => onToggleSelect?.(order.id, e) : () => onSelect(order)}
                style={{ cursor: "pointer" }}
              >
                {editMode && (
                  <td
                    className="px-6 py-4"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleSelect?.(order.id, e);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      className="rounded border-synvora-border text-synvora-primary focus:ring-synvora-primary"
                      onChange={() => { }} // Managed by parent td click
                    />
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 font-medium text-synvora-text">
                  <div className="flex flex-col">
                    <span>{order.orderNumber}</span>
                    <span className="text-xs font-medium text-synvora-text-secondary">
                      {formatDateTime(order.processedAt)}
                    </span>
                  </div>
                </td>
                {isAdmin && (
                  <td className="whitespace-nowrap px-6 py-4 text-synvora-text-secondary">
                    {order.shopifyOrderNumber || "—"}
                  </td>
                )}
                <td className="whitespace-nowrap px-6 py-4 text-synvora-text">
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
                <td className="whitespace-nowrap px-6 py-4 text-synvora-text-secondary">
                  {order.venue?.name ?? "CICCIO"}
                </td>
                <td className="whitespace-nowrap px-6 py-4 font-medium text-synvora-text">
                  {formatCurrency(order.totalAmount, order.currency)}
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
                      BADGES[order.financialStatus ?? ""] ?? "bg-slate-100 text-synvora-text-secondary"
                    )}
                  >
                    {order.financialStatus ?? "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-medium text-synvora-text">
                    {formatCurrency(payoutValue, order.currency)}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <span className="font-medium text-synvora-text">
                    {typeof order.originalAmount === "number"
                      ? formatCurrency(order.originalAmount, "EGP")
                      : "—"}
                  </span>
                </td>
                <td className="whitespace-nowrap px-6 py-4 text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                  {!editMode && canManage && (
                    <Menu as="div" className="relative inline-block text-left">
                      <div>
                        <Menu.Button className="inline-flex items-center gap-1 rounded-lg border border-synvora-border px-3 py-1.5 text-xs font-semibold text-synvora-text-secondary transition hover:border-synvora-primary hover:text-synvora-primary">
                          Actions
                          <MoreVertical className="h-3 w-3" />
                        </Menu.Button>
                      </div>
                      <Transition
                        as={Fragment}
                        enter="transition ease-out duration-100"
                        enterFrom="transform opacity-0 scale-95"
                        enterTo="transform opacity-100 scale-100"
                        leave="transition ease-in duration-75"
                        leaveFrom="transform opacity-100 scale-100"
                        leaveTo="transform opacity-0 scale-95"
                      >
                        <Menu.Items className="absolute right-0 z-50 mt-2 w-40 origin-top-right rounded-lg border border-synvora-border bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                          <div className="py-1">
                            {onEdit && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    type="button"
                                    onClick={() => onEdit(order)}
                                    className={`${active ? "bg-synvora-surface-active text-synvora-text" : "text-synvora-text"
                                      } flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold`}
                                  >
                                    <Edit className="h-3 w-3" />
                                    Edit
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                            {onDuplicate && (
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    type="button"
                                    onClick={() => onDuplicate(order)}
                                    className={`${active ? "bg-synvora-surface-active text-synvora-text" : "text-synvora-text"
                                      } flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold`}
                                  >
                                    <Copy className="h-3 w-3" />
                                    Duplicate
                                  </button>
                                )}
                              </Menu.Item>
                            )}
                            {onDelete && (
                              <>
                                <div className="my-1 border-t border-synvora-border" />
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      type="button"
                                      onClick={() => onDelete(order)}
                                      className={`${active ? "bg-rose-50 text-rose-700" : "text-rose-600"
                                        } flex w-full items-center gap-2 px-4 py-2 text-xs font-semibold`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                      Delete
                                    </button>
                                  )}
                                </Menu.Item>
                              </>
                            )}
                          </div>
                        </Menu.Items>
                      </Transition>
                    </Menu>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {orders.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-synvora-text">No orders found</p>
          <p className="text-sm text-synvora-text-secondary">
            Adjust your filters or connect a Shopify store to sync orders into Synvora.
          </p>
        </div>
      )}
    </div>
  );
}
