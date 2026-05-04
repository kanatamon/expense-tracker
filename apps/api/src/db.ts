import { Database } from "bun:sqlite";
import { join } from "path";

const DDL = `
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK(amount > 0 AND amount <= 999999999.00),
  category    TEXT    NOT NULL CHECK(category IN ('food', 'transport', 'accommodation', 'other')),
  description TEXT    NOT NULL CHECK(length(description) > 0 AND length(description) <= 500),
  date        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
`;

const PROD_DB_PATH = join(import.meta.dir, "..", "..", "..", "data", "expenses.db");

export function initDb(path?: string, { readonly = false } = {}): Database {
  const resolved = path ?? PROD_DB_PATH;
  const db = new Database(resolved, { create: !readonly, readonly });
  if (!readonly) {
    db.run(DDL);
  }
  return db;
}

export function createTestDb(): Database {
  const testDb = new Database(":memory:");
  testDb.run(DDL);
  return testDb;
}
