# QA Testing Contract

**Framework:** Playwright (API + browser tests)
**Test runner:** `npx playwright test`
**Location:** `tests/` at repo root
**Base URL:** `http://localhost:3001` (single server serving both FE and API)

---

## Architecture

### Single server
Elysia on `:3001` serves:
- API routes at `/api/*`
- Static frontend build from `apps/web/dist/` at `/`

The QA agent must configure this before running tests. See infra details below.

### Seeding strategy
Tests seed and clean via direct import of `ExpenseRepository` (from `apps/api/src/`), not via HTTP.

```typescript
// tests/fixtures.ts
import { ExpenseRepository } from "../apps/api/src/repository";

export async function seedExpenses(db, expenses: CreateExpensePayload[]) {
  const repo = new ExpenseRepository(db);
  await repo.clear(); // truncate all rows
  for (const expense of expenses) {
    await repo.create(expense);
  }
}

export async function clearExpenses(db) {
  const repo = new ExpenseRepository(db);
  await repo.clear();
}
```

The repo must expose a `clear(): void` method that truncates the `expenses` table.

### Test file layout
- `tests/` at repo root
- Files named `*.api.spec.ts` for API-only tests
- Files named `*.e2e.spec.ts` for browser E2E tests

---

## Playwright configuration

### `playwright.config.ts` at repo root
| Setting              | Value                                      |
|----------------------|--------------------------------------------|
| `testDir`            | `./tests`                                  |
| `webServer`          | `{ command: "bun run start:prod", port: 3001, reuseExistingServer: false }` |
| `use.baseURL`        | `http://localhost:3001`                    |
| `use.viewport`       | iPhone 14 (`390x844`)                      |
| `use.contextOptions` | `{ isMobile: true, hasTouch: true }`       |
| `projects`           | `chromium` (mobile)                        |

### `webServer` command
The `bun run start:prod` script must:
1. Build the frontend: `bun --cwd apps/web run build`
2. Start Elysia with static file serving: the Elysia app serves `apps/web/dist/` at `/`

### Dependencies
- `@playwright/test`
- Playwright browsers: `npx playwright install chromium`

---

## Test coverage

### Happy paths
| Test                          | Type  | Description                                                                 |
|-------------------------------|-------|-----------------------------------------------------------------------------|
| `create via UI, appears in list` | e2e  | Fill form, submit, verify expense appears in `ExpenseList`                  |
| `list with no filter`         | api   | GET /api/expenses returns all expenses with correct total and subtotals     |
| `list with category filter`   | api   | GET /api/expenses?category=food returns only food expenses                  |
| `list sorted by date desc`    | api   | Default sort order is correct                                               |
| `list sorted by amount asc`   | api   | GET /api/expenses?sort_by=amount&sort_order=asc works                       |
| `CSV export`                  | api   | GET /api/expenses/csv returns text/csv with correct headers and rows        |
| `subtotals computed correctly`| api   | subtotals match sum of filtered expenses per category                       |

### Edge cases
| Test                              | Type  | Description                                                                 |
|-----------------------------------|-------|-----------------------------------------------------------------------------|
| `create with zero amount`         | api   | 400 validation error                                                        |
| `create with negative amount`     | api   | 400 validation error                                                        |
| `create with empty description`   | api   | 400 validation error                                                        |
| `create with description > 500 chars` | api | 400 validation error                                                    |
| `create with invalid category`    | api   | 400 validation error                                                        |
| `create with invalid date format` | api   | 400 validation error                                                        |
| `list with no data`               | api   | Returns empty expenses array, total 0, all subtotals 0                      |
| `CSV export with no data`         | api   | Returns CSV with only header row                                            |
| `list with nonexistent category`  | api   | Returns empty results (category filter is ignored or validated)             |
| `health check`                    | api   | GET / returns `{"status": "ok"}`                                            |

---

## Fixture lifecycle

Each test file uses `beforeEach` to seed and `afterEach` to clear:

```typescript
test.beforeEach(async () => {
  db = new Database("data/expenses.db");
  await seedExpenses(db, [/* test data */]);
});

test.afterEach(async () => {
  await clearExpenses(db);
  db.close();
});
```

---

## Pre-requisites for QA agent

The QA agent must:
1. Add `clear()` method to `ExpenseRepository` in `apps/api/src/`
2. Add `apps/web` as a static file dependency in Elysia (serve `dist/` at `/`)
3. Add `bun run start:prod` script to root `package.json`
4. Install and configure Playwright
5. Write test files

All changes should be committed to a single branch.
