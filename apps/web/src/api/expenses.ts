import { treaty } from "@elysiajs/eden";
import type { App } from "@expense-tracker/api";
import type { Expense, ExpenseListResponse, CreateExpensePayload, Category } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";
const client = treaty<App>(API_URL);

function getEdenErrorMessage(error: { value: unknown }, fallback: string): string {
  const value = error.value as { message?: string };
  return value.message ?? fallback;
}

export async function fetchExpenses(
  params?: {
    category?: Category;
    sort_by?: "date" | "amount";
    sort_order?: "asc" | "desc";
  },
): Promise<ExpenseListResponse> {
  const res = await client.api.expenses.get({ query: params ?? {} });
  if (res.error) {
    throw new Error(getEdenErrorMessage(res.error, "Failed to fetch expenses"));
  }
  if (!res.data) throw new Error("No data returned from server");
  return res.data;
}

// Eden Treaty infers res.data as unknown for 201 responses because
// Elysia's status(201, value) wraps the return in a generic Response
// type that loses the schema-level inference. This guard is a workaround
// until eden resolves. See: https://github.com/elysiajs/eden/issues/137
function isExpense(value: unknown): value is Expense {
  return (
    typeof value === "object" &&
    value !== null &&
    "amount" in value &&
    "category" in value &&
    "id" in value
  );
}

export async function createExpense(
  payload: CreateExpensePayload,
): Promise<Expense> {
  const res = await client.api.expenses.post(payload);
  if (res.error) {
    throw new Error(getEdenErrorMessage(res.error, "Failed to create expense"));
  }
  if (!res.data || !isExpense(res.data)) {
    throw new Error("No data returned from server");
  }
  return res.data;
}

export async function exportCSV(params?: { category?: Category }): Promise<void> {
  const res = await client.api.expenses.csv.get({ query: params ?? {} });
  if (res.error) {
    throw new Error(getEdenErrorMessage(res.error, "Failed to export CSV"));
  }
  if (!res.data || typeof res.data !== "string") {
    throw new Error("No data returned from server");
  }

  const blob = new Blob([res.data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
}
