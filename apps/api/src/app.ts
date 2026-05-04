import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { ExpenseRepository } from "./repository";
import { handleHealthCheck, handleCreateExpense, handleListExpenses, handleExportCsv } from "./handlers";
import {
  CreateExpenseBody,
  ListExpensesQuery,
  ExpenseSchema,
  ExpenseListResponse,
  ApiError,
} from "./types";

export function createApp(repo: ExpenseRepository): Elysia {
  return new Elysia()
    .use(cors())
    .get("/", () => handleHealthCheck())
    .post(
      "/api/expenses",
      ({ body }) => handleCreateExpense(repo, body),
      {
        body: CreateExpenseBody,
        response: {
          201: ExpenseSchema,
          500: ApiError,
        },
      }
    )
    .get(
      "/api/expenses",
      ({ query }) => handleListExpenses(repo, query),
      {
        query: ListExpensesQuery,
        response: {
          200: ExpenseListResponse,
          500: ApiError,
        },
      }
    )
    .get(
      "/api/expenses/csv",
      ({ query }) => handleExportCsv(repo, query),
      {
        query: ListExpensesQuery,
      }
    );
}