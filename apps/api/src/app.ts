import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { ExpenseRepository } from "./repository";
import {
  CreateExpenseBody,
  ListExpensesQuery,
  ExpenseSchema,
  ExpenseListResponseSchema,
  ApiError,
} from "./types";
import { handleHealthCheck } from "./handlers/health";
import { createExpense, listExpenses, exportCsv } from "./handlers/expense";

export function createApp(repo: ExpenseRepository) {
  return new Elysia()
    .use(cors())
    .decorate("repo", repo)
    .onError(({ code, error, set }) => {
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: "NotFound", message: String(error) };
      }
      if (code === "PARSE") {
        set.status = 400;
        return { error: "ParseError", message: error.message };
      }
      if (code === "VALIDATION") {
        // Let Elysia use default validation error response
        return;
      }
      set.status = 500;
      return { error: "InternalError", message: "An unexpected error occurred" };
    })
    .get("/", handleHealthCheck)
    .post("/api/expenses", createExpense, {
      body: CreateExpenseBody,
      response: { 201: ExpenseSchema, 500: ApiError },
    })
    .get("/api/expenses", listExpenses, {
      query: ListExpensesQuery,
      response: { 200: ExpenseListResponseSchema, 500: ApiError },
    })
    .get(
      "/api/expenses/csv",
      exportCsv,
      {
        query: ListExpensesQuery,
      }
    );
}
