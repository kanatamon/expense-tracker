import { status } from "elysia";
import type { ExpenseRepository } from "../repository";
import type { CreateExpenseBodyType, ListExpensesQueryType } from "../types";

/**
 * Minimal handler context type.
 *
 * Elysia infers a route-specific context (with typed body, query, and
 * a status function keyed to the response schema) at call sites.
 * Using a bare `Context` here would clash with that richer type, so we
 * define only the properties each handler actually destructures.
 */

export const createExpense = ({
  body,
  repo,
}: {
  body: CreateExpenseBodyType;
  repo: ExpenseRepository;
}) => {
  return status(201, repo.create(body));
};

export const listExpenses = ({
  query,
  repo,
}: {
  query: ListExpensesQueryType;
  repo: ExpenseRepository;
}) => {
  return repo.list(query);
};

export const exportCsv = ({
  query,
  repo,
  set,
}: {
  query: ListExpensesQueryType;
  repo: ExpenseRepository;
  set: { headers: Record<string, string | number> };
}) => {
  set.headers["Content-Type"] = "text/csv";
  set.headers["Content-Disposition"] = 'attachment; filename="expenses.csv"';
  return repo.exportCsv(query);
};
