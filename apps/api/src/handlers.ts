import type { CreateExpenseBodyType, ListExpensesQueryType } from "./types";
import type { ExpenseRepository } from "./repository";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function internalErrorResponse(): Response {
  return jsonResponse(
    {
      error: "InternalError",
      message: "An unexpected error occurred",
    },
    500
  );
}

export function handleHealthCheck(): Response {
  return jsonResponse({ status: "ok" }, 200);
}

export function handleCreateExpense(
  repo: ExpenseRepository,
  body: CreateExpenseBodyType
): Response {
  try {
    const expense = repo.create(body);

    return jsonResponse(
      {
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        created_at: expense.created_at,
      },
      201
    );
  } catch {
    return internalErrorResponse();
  }
}

export function handleListExpenses(
  repo: ExpenseRepository,
  query: ListExpensesQueryType
): Response {
  try {
    const result = repo.list(query);
    return jsonResponse(result, 200);
  } catch {
    return internalErrorResponse();
  }
}

export function handleExportCsv(
  repo: ExpenseRepository,
  query: ListExpensesQueryType
): Response {
  try {
    const csv = repo.exportCsv(query);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="expenses.csv"',
      },
    });
  } catch {
    return internalErrorResponse();
  }
}
