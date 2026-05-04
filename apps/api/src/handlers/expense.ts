import type { Context } from "elysia";
import { status, NotFoundError } from "elysia";
import type { ExpenseRepository } from "../repository";

type AppContext = Context & { repo: ExpenseRepository };

export const createExpense = ({ body, repo }: AppContext) => {
  return status(201, repo.create(body));
};

export const listExpenses = ({ query, repo }: AppContext) => {
  return repo.list(query);
};

export const exportCsv = ({ query, repo, set }: AppContext) => {
  set.headers["Content-Type"] = "text/csv";
  set.headers["Content-Disposition"] = 'attachment; filename="expenses.csv"';
  return repo.exportCsv(query);
};
