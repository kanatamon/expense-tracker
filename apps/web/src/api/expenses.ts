import type {
  Expense,
  ExpenseListResponse,
  CreateExpensePayload,
} from "../types";

export async function fetchExpenses(
  params?: {
    category?: string;
    sort_by?: string;
    sort_order?: string;
  },
): Promise<ExpenseListResponse> {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.sort_by) searchParams.set("sort_by", params.sort_by);
  if (params?.sort_order) searchParams.set("sort_order", params.sort_order);

  const qs = searchParams.toString();
  const url = `/api/expenses${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw body ?? { error: "NetworkError", message: "Failed to fetch expenses" };
  }
  return res.json();
}

export async function createExpense(
  payload: CreateExpensePayload,
): Promise<Expense> {
  const res = await fetch("/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw body ?? { error: "NetworkError", message: "Failed to create expense" };
  }
  return res.json();
}

export function exportCSV(params?: { category?: string }): void {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);

  const qs = searchParams.toString();
  const url = `/api/expenses/csv${qs ? `?${qs}` : ""}`;

  const a = document.createElement("a");
  a.href = url;
  a.download = "expenses.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
