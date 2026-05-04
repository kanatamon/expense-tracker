import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { Database } from "bun:sqlite";
import { handleHealthCheck, handleCreateExpense, handleListExpenses, handleExportCsv } from "./handlers";

export function createApp(db: Database): Elysia {
  return new Elysia()
    .use(cors())
    .get("/", () => handleHealthCheck())
    .post("/api/expenses", ({ body }) => handleCreateExpense(db, body as Record<string, unknown>))
    .get("/api/expenses", ({ query }) => handleListExpenses(db, query as Record<string, string | undefined>))
    .get("/api/expenses/csv", ({ query }) => handleExportCsv(db, query as Record<string, string | undefined>));
}
