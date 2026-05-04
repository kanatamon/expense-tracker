// Re-export domain types from API (source of truth)
import type { Expense, ExpenseListResponse, CreateExpensePayload, Category } from "@expense-tracker/api";
export type { Expense, ExpenseListResponse, CreateExpensePayload, Category };

export interface ValidationDetail {
  field: string;
  message: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: ValidationDetail[];
}

export function formatAmount(amount: number): string {
  return `฿${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const CATEGORIES: Category[] = [
  "food",
  "transport",
  "accommodation",
  "other",
];

export const CATEGORY_LABELS: Record<Category, string> = {
  food: "Food",
  transport: "Transport",
  accommodation: "Accommodation",
  other: "Other",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  food: "#FFE4E1",
  transport: "#E8F5E9",
  accommodation: "#FFF3E0",
  other: "#E8EAF6",
};
