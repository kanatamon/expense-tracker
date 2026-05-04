import { treaty } from "@elysiajs/eden";
import type { App } from "@expense-tracker/api";
import type { Expense, ExpenseListResponse, CreateExpensePayload, Category } from "../types";

const client = treaty<App>("http://localhost:3001");

export async function fetchExpenses(
  params?: {
    category?: Category;
    sort_by?: "date" | "amount";
    sort_order?: "asc" | "desc";
  },
): Promise<ExpenseListResponse> {
  const res = await client.api.expenses.get({ query: params ?? {} });
  if (res.error) throw res.error;
  if (!res.data) throw new Error("No data returned from server");
  return res.data;
}

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
  if (res.error) throw res.error;
  if (!res.data || !isExpense(res.data)) {
    throw new Error("No data returned from server");
  }
  return res.data;
}

export async function exportCSV(params?: { category?: Category }): Promise<void> {
  const res = await client.api.expenses.csv.get({ query: params ?? {} });
  if (res.error) return;
  if (!res.data || typeof res.data !== "string") return;

  const blob = new Blob([res.data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  a.click();
  URL.revokeObjectURL(url);
}
