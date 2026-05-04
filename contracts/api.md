# REST API Contract

Base URL: `http://localhost:3001/api`

## Schema-first design

All request/response shapes are defined as Elysia `t` schemas in `apps/api/src/types.ts`.
These schemas serve as the single source of truth for:

- **Runtime validation** — Elysia validates incoming requests against schemas before handlers run
- **Type inference** — `Static<typeof Schema>` produces TypeScript types with zero duplication
- **Eden Treaty** — `apps/web` imports types from the API via Eden Treaty (`@elysiajs/eden`)
- **OpenAPI docs** — `@elysiajs/swagger` auto-generates from these schemas

### Schema catalog (`apps/api/src/types.ts`)

| Schema name           | Kind      | Description                                    |
|-----------------------|-----------|------------------------------------------------|
| `CategoryEnum`        | `t.Union` | `"food" \| "transport" \| "accommodation" \| "other"` |
| `ExpenseSchema`       | `t.Object`| Full expense row (id, amount, category, description, date, created_at) |
| `CreateExpenseBody`   | `t.Object`| POST /api/expenses request body                |
| `ListExpensesQuery`   | `t.Object`| GET /api/expenses query parameters             |
| `ExpenseListResponse` | `t.Object`| GET /api/expenses response shape               |
| `ApiError`            | `t.Object`| Error response shape (400, 500)                |

### Validation

Validation is handled by Elysia's built-in `t` schemas at the route level.
No manual `validateCreateExpense()` function. No `as` casts.
Elysia uses its own built-in error messages — no custom error message overrides.

---

## GET / — Health check

### Response 200

```json
{ "status": "ok" }
```

---

## POST /api/expenses — Create a new expense

- **Route schema:** `body: CreateExpenseBody`
- **Handler signature:** `(repo: ExpenseRepository, body: CreateExpenseBody) => Response`

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

### Response 400 — Validation error (Elysia built-in)

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

- **Route schema:** `query: ListExpensesQuery`
- **Handler signature:** `(repo: ExpenseRepository, query: ListExpensesQuery) => Response`

### Query parameters

| Parameter    | Type   | Required | Default | Description                         |
|--------------|--------|----------|---------|-------------------------------------|
| `category`   | string | no       | —       | Filter by category (exact match)   |
| `sort_by`    | string | no       | `date`  | Field to sort by (`date`, `amount`) |
| `sort_order` | string | no       | `desc`  | `asc` or `desc`                     |

### Response 200

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

Same error shape as POST 500.

---

## GET /api/expenses/csv — Export filtered list as CSV

- **Route schema:** `query: ListExpensesQuery`
- **Handler signature:** `(repo: ExpenseRepository, query: ListExpensesQuery) => Response`

### Query parameters

Same as `GET /api/expenses` (`category`, `sort_by`, `sort_order`).

### Response 200

- **Content-Type:** `text/csv`
- **Content-Disposition:** `attachment; filename="expenses.csv"`

```
id,amount,category,description,date,created_at
1,450.60,food,Team lunch at CentralWorld,2026-05-04T12:30:00.000Z,2026-05-04T10:00:00.000Z
```

### Response 500

Same error shape as above.
