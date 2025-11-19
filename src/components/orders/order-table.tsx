import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
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
  onToggleSelect?: (orderId: number) => void;
  onToggleSelectAll?: () => void;
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
  onToggleSelectAll
}: OrderTableProps) {
  const allSelected = editMode && orders.length > 0 && orders.every(order => selectedOrders.has(order.id));
  const someSelected = editMode && orders.some(order => selectedOrders.has(order.id));

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                  className="rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary"
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
        <tbody className="divide-y divide-slate-100 bg-white">
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
                className={`hover:bg-slate-50/80 ${isSelected ? "bg-synvora-primary/5" : ""}`}
                onClick={editMode ? () => onToggleSelect?.(order.id) : () => onSelect(order)}
                style={{ cursor: "pointer" }}
              >
              {editMode && (
                <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect?.(order.id)}
                    className="rounded border-slate-300 text-synvora-primary focus:ring-synvora-primary"
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
              )}
              <td className="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                <div className="flex flex-col">
                  <span>{order.orderNumber}</span>
                  <span className="text-xs font-medium text-slate-500">
                    {formatDateTime(order.processedAt)}
                  </span>
                </div>
              </td>
              {isAdmin && (
                <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                  {order.shopifyOrderNumber || "—"}
                </td>
              )}
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
              <td className="whitespace-nowrap px-6 py-4 text-slate-600">
                {order.venue?.name ?? "CICCIO"}
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
                <span className="font-medium text-slate-900">
                  {formatCurrency(payoutValue, order.currency)}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4">
                <span className="font-medium text-slate-900">
                  {typeof order.originalAmount === "number"
                    ? formatCurrency(order.originalAmount, "EGP")
                    : "—"}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right print:hidden" onClick={(e) => e.stopPropagation()}>
                {!editMode && canManage && (
                  <Menu as="div" className="relative inline-block text-left">
                    <div>
                      <Menu.Button className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-synvora-primary hover:text-synvora-primary">
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
                      <Menu.Items className="absolute right-0 z-10 mt-2 w-40 origin-top-right rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <div className="py-1">
                          {onEdit && (
                            <Menu.Item>
                              {({ active }) => (
                                <button
                                  type="button"
                                  onClick={() => onEdit(order)}
                                  className={`${
                                    active ? "bg-slate-50 text-slate-900" : "text-slate-700"
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
                                  className={`${
                                    active ? "bg-slate-50 text-slate-900" : "text-slate-700"
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
                              <div className="my-1 border-t border-slate-200" />
                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    type="button"
                                    onClick={() => onDelete(order)}
                                    className={`${
                                      active ? "bg-rose-50 text-rose-700" : "text-rose-600"
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
          <p className="text-lg font-semibold text-slate-900">No orders found</p>
          <p className="text-sm text-slate-500">
            Adjust your filters or connect a Shopify store to sync orders into Synvora.
          </p>
        </div>
      )}
    </div>
  );
}
