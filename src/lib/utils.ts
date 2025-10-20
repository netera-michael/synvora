import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency
  }).format(value);
}

export function formatDate(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatDateTime(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return `${parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  })} at ${parsed.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).toLowerCase()}`;
}

export function formatDayTime(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return `${parsed.toLocaleDateString("en-US", { weekday: "long" })} at ${parsed
    .toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    })
    .toLowerCase()}`;
}

const pad = (value: number) => value.toString().padStart(2, "0");

export function formatDateTimeForInput(date: Date | string) {
  const parsed = typeof date === "string" ? new Date(date) : date;
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
}
