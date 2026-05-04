# REST API Contract

Base URL: `http://localhost:3001`

---

## Design conventions

### Handler pattern (Elysia-native)

All handlers live in `apps/api/src/handlers/<resource>.ts` and follow this shape:

```ts
import type { Context } from "elysia";
import { status } from "elysia";
import type { ExpenseRepository } from "../repository";

// Type-safe context with injected dependencies
type AppContext = Context & { repo: ExpenseRepository };

export const createExpense = ({ body, repo }: AppContext) => {
  return status(201, repo.create(body));
};
```

Rules:
- **No raw `new Response()` calls.** Return plain objects (Elysia serialises to JSON).
- **No manual `jsonResponse()` helper.** Use `status(code, payload)` for non-200 or `set.status = code` + return.
- **No try/catch in handlers.** Throw on error; `.onError()` lifecycle handles it centrally.
- **No manual dependency injection.** Repositories are injected via `.decorate("repo", repo)` and accessed from `Context`.
- **CSV exports** use `set.headers["Content-Type"]` and `set.headers["Content-Disposition"]` then return a string.

### App wiring (`apps/api/src/app.ts`)

```ts
import { Elysia, t } from "elysia";
import { cors } from "@elysiajs/cors";

export function createApp(repo: ExpenseRepository): Elysia {
  return new Elysia()
    .use(cors())
    .decorate("repo", repo)
    .onError(({ code, error, set }) => {
      // VALIDATION and UNKNOWN are left to Elysia defaults
      if (code === "NOT_FOUND") {
        set.status = 404;
        return { error: "NotFound", message: String(error) };
      }
      if (code === "PARSE") {
        set.status = 400;
        return { error: "ParseError", message: error.message };
      }
      // INTERNAL_SERVER_ERROR + everything else
      set.status = 500;
      return { error: "InternalError", message: "An unexpected error occurred" };
    })
    .get("/", handleHealthCheck)
    .post("/api/expenses", createExpense, { body: CreateExpenseBody, response: { 201: ExpenseSchema, 500: ApiError } })
    .get("/api/expenses", listExpenses, { query: ListExpensesQuery, response: { 200: ExpenseListResponse, 500: ApiError } })
    .get("/api/expenses/csv", exportCsv, { query: ListExpensesQuery });
}
```

### Tests

Tests use `app.handle(request)` — the Elysia-native integration test pattern:

```ts
const app = createApp(repo);
const req = new Request("http://localhost/api/expenses", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 450.6, category: "food", description: "Lunch", date: "2026-05-04T12:00:00.000Z" }),
});
const res = await app.handle(req);
expect(res.status).toBe(201);
```

---

## Schema-first design

All request/response shapes are defined as Elysia `t` schemas in `apps/api/src/types.ts`.
These schemas serve as the single source of truth for:

- **Runtime validation** — Elysia validates incoming requests against schemas before handlers run
- **Type inference** — `Static<typeof Schema>` produces TypeScript types with zero duplication
- **Eden Treaty** — `apps/web` imports types from the API via Eden Treaty (`@elysiajs/eden`)
- **OpenAPI docs** — `@elysiajs/swagger` auto-generates from these schemas
- **Response validation** — since handlers return plain objects, Elysia validates **outgoing** payloads against the declared `response` schema

### Schema catalog (`apps/api/src/types.ts`)

| Schema name             | Kind       | Description                                          |
|-------------------------|------------|------------------------------------------------------|
| `CategoryEnum`          | `t.Union`  | `"food" \| "transport" \| "accommodation" \| "other"` |
| `ExpenseSchema`         | `t.Object` | Full expense row (id, amount, category, description, date, created_at) |
| `CreateExpenseBody`     | `t.Object` | POST /api/expenses request body                      |
| `ListExpensesQuery`     | `t.Object` | GET /api/expenses query parameters                   |
| `ExpenseListResponse`   | `t.Object` | GET /api/expenses response shape                     |
| `ApiError`              | `t.Object` | Error response shape (404, 500)                      |

```ts
// ApiError shape
export const ApiError = t.Object({
  error: t.String(),
  message: t.String(),
});
```

### Validation

Validation is handled by Elysia's built-in `t` schemas at the route level.
No manual `validateCreateExpense()` function. No `as` casts.
Elysia uses its own built-in error messages — no custom error message overrides.

---

## Error response consistency

| Scenario           | HTTP  | Shape                                                        | Source                          |
|--------------------|-------|--------------------------------------------------------------|----------------------------------|
| Validation failure | 422   | `{ type: "validation", on, summary, property, message }`     | Elysia default (pass-through)   |
| Parse error        | 400   | `{ error: "ParseError", message }`                           | `.onError()` returns            |
| Not found          | 404   | `{ error: "NotFound", message }`                             | `.onError()` returns            |
| Internal error     | 500   | `{ error: "InternalError", message }`                        | `.onError()` returns            |

All non-validation error shapes share `error` and `message` fields for consistency.
Validation errors follow the Elysia-native format and are passed through `.onError()` without modification.

---

## GET / — Health check

Handler: `handlers/health.ts`

Response is **always** 200.

Status is set by route response schema; no explicit `status()` needed.

### Response 200

```json
{ "status": "ok" }
```

---

## POST /api/expenses — Create a new expense

- **Route schema:** `body: CreateExpenseBody`, `response: { 201: ExpenseSchema, 500: ApiError }`
- **Handler:** `handlers/expense.ts :: createExpense`

### Request body

| Field         | Type     | Required | Elysia validation                                                |
|---------------|----------|----------|------------------------------------------------------------------|
| `amount`      | number   | yes      | `t.Number({ minimum: 0, exclusiveMinimum: true, maximum: 999999999, multipleOf: 0.01 })` |
| `category`    | string   | yes      | `CategoryEnum`                                                   |
| `description` | string   | yes      | `t.String({ minLength: 1, maxLength: 500 })`                     |
| `date`        | string   | yes      | `t.String({ format: "date-time" })`                              |

### Response 201 — Created

```json
{
  "id": 1,
  "amount": 450.60,
  "category": "food",
  "description": "Team lunch at CentralWorld",
  "date": "2026-05-04T12:30:00.000Z",
  "created_at": "2026-05-04T10:00:00.000Z"
}
```

Status is set via `status(201, expense)` in the handler. Elysia validates the shape against `ExpenseSchema`.

### Response 422 — Validation error (Elysia built-in, pass-through `.onError()`)

```json
{
  "type": "validation",
  "on": "body",
  "summary": "Expected number",
  "property": "/amount",
  "message": "Expected number"
}
```

### Response 500 — Internal server error

```json
{
  "error": "InternalError",
  "message": "An unexpected error occurred"
}
```

---

## GET /api/expenses — List expenses

- **Route schema:** `query: ListExpensesQuery`, `response: { 200: ExpenseListResponse, 500: ApiError }`
- **Handler:** `handlers/expense.ts :: listExpenses`

### Query parameters

| Parameter    | Type   | Required | Default | Description                         |
|--------------|--------|----------|---------|-------------------------------------|
| `category`   | string | no       | —       | Filter by category (exact match)   |
| `sort_by`    | string | no       | `date`  | Field to sort by (`date`, `amount`) |
| `sort_order` | string | no       | `desc`  | `asc` or `desc`                     |

### Response 200

Handler returns a plain object. Elysia validates against `ExpenseListResponse`.

```json
{
  "expenses": [
    {
      "id": 1,
      "amount": 450.60,
      "category": "food",
      "description": "Team lunch at CentralWorld",
      "date": "2026-05-04T12:30:00.000Z",
      "created_at": "2026-05-04T10:00:00.000Z"
    }
  ],
  "total": 450.60,
  "subtotals": {
    "food": 450.60,
    "transport": 0,
    "accommodation": 0,
    "other": 0
  }
}
```

| Field       | Description                                                   |
|-------------|---------------------------------------------------------------|
| `expenses`  | Array of expense objects, sorted by `date` descending         |
| `total`     | Sum of `amount` across the current filtered result set        |
| `subtotals` | Per-category sums computed against the current filtered set   |

**Notes:**
- `subtotals` always contains all 4 categories regardless of filter.
- When no `category` filter is applied, each subtotal reflects all expenses in that category.
- When a `category` filter is applied, only that category's subtotal is non-zero (the rest are 0).

### Response 500 — Internal server error

Same shape as POST 500.

---

## GET /api/expenses/csv — Export filtered list as CSV

- **Route schema:** `query: ListExpensesQuery`
- **No response schema** (content is text/csv, not JSON)
- **Handler:** `handlers/expense.ts :: exportCsv`

### Query parameters

Same as `GET /api/expenses` (`category`, `sort_by`, `sort_order`).

### Response 200

Handler sets headers via `set.headers` then returns a plain string (CSV content).

- **Content-Type:** `text/csv`
- **Content-Disposition:** `attachment; filename="expenses.csv"`

```
id,amount,category,description,date,created_at
1,450.60,food,Team lunch at CentralWorld,2026-05-04T12:30:00.000Z,2026-05-04T10:00:00.000Z
```

### Response 500 — Internal server error

Same error shape as POST 500. Note: `.onError()` returns JSON even if the happy path is CSV.
