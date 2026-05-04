# REST API Contract

Base URL: `http://localhost:3001/api`

---

## POST /api/expenses — Create a new expense

### Request body (JSON)

| Field         | Type     | Required | Validation                                                           |
|---------------|----------|----------|----------------------------------------------------------------------|
| `amount`      | number   | yes      | > 0, <= 999999999.00, max 2 decimal places                          |
| `category`    | string   | yes      | one of: `food`, `transport`, `accommodation`, `other`                |
| `description` | string   | yes      | non-empty, max 500 characters                                        |
| `date`        | string   | yes      | valid ISO 8601 datetime (e.g. `2026-05-04T12:30:00.000Z`)           |

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

### Response 400 — Validation error

```json
{
  "error": "ValidationError",
  "message": "Amount must be greater than 0",
  "details": [
    { "field": "amount", "message": "Amount must be greater than 0" }
  ]
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

Same shape as above.

---

## GET /api/expenses/csv — Export filtered list as CSV

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
