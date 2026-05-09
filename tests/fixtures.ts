import { execFileSync } from "node:child_process";
import type { Database } from "bun:sqlite";
import type { CreateExpensePayload } from "../apps/api/src/types";

const dbPath = "data/expenses.db";

function runBunDbScript(script: string): void {
	execFileSync("bun", ["--eval", script], {
		cwd: process.cwd(),
		stdio: "pipe",
		encoding: "utf8",
	});
}

export async function seedExpenses(
	_db: Database | null,
	expenses: CreateExpensePayload[],
): Promise<void> {
	runBunDbScript(`
    import { initDb } from "./apps/api/src/db";
    import { ExpenseRepository } from "./apps/api/src/repository";

    const db = initDb(${JSON.stringify(dbPath)});
    const repo = new ExpenseRepository(db);
    repo.clear();
    for (const expense of ${JSON.stringify(expenses)}) {
      repo.create(expense);
    }
    db.close();
  `);
}

export async function clearExpenses(_db?: Database | null): Promise<void> {
	runBunDbScript(`
    import { initDb } from "./apps/api/src/db";
    import { ExpenseRepository } from "./apps/api/src/repository";

    const db = initDb(${JSON.stringify(dbPath)});
    const repo = new ExpenseRepository(db);
    repo.clear();
    db.close();
  `);
}

export const sampleExpenses: CreateExpensePayload[] = [
	{
		amount: 100,
		category: "food",
		description: "Lunch",
		date: "2026-01-01T12:00:00.000Z",
	},
	{
		amount: 250.5,
		category: "transport",
		description: "Taxi",
		date: "2026-02-01T12:00:00.000Z",
	},
	{
		amount: 75.25,
		category: "food",
		description: "Dinner",
		date: "2026-03-01T12:00:00.000Z",
	},
	{
		amount: 500,
		category: "accommodation",
		description: "Hotel",
		date: "2026-04-01T12:00:00.000Z",
	},
];
