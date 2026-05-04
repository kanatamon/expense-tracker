# Database Schema

**Engine:** SQLite via `bun:sqlite`
**File:** `data/expenses.db`

---

## Table: `expenses`

| Column       | Type    | Constraints                                                  |
|--------------|---------|--------------------------------------------------------------|
| `id`         | INTEGER | PRIMARY KEY AUTOINCREMENT                                    |
| `amount`     | REAL    | NOT NULL, CHECK(amount > 0), CHECK(amount <= 999999999.00)  |
| `category`   | TEXT    | NOT NULL, CHECK(category IN ('food', 'transport', 'accommodation', 'other')) |
| `description`| TEXT    | NOT NULL, CHECK(length(description) > 0), CHECK(length(description) <= 500) |
| `date`       | TEXT    | NOT NULL — ISO 8601 datetime string                          |
| `created_at` | TEXT    | NOT NULL DEFAULT (datetime('now')) — ISO 8601 datetime       |

## Indexes

| Index name            | Column(s) | Purpose                           |
|-----------------------|-----------|-----------------------------------|
| `idx_expenses_date`   | `date`     | Sorting by date (most recent)    |
| `idx_expenses_category`| `category` | Filtering by category            |

## DDL

```sql
CREATE TABLE IF NOT EXISTS expenses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  amount      REAL    NOT NULL CHECK(amount > 0 AND amount <= 999999999.00),
  category    TEXT    NOT NULL CHECK(category IN ('food', 'transport', 'accommodation', 'other')),
  description TEXT    NOT NULL CHECK(length(description) > 0 AND length(description) <= 500),
  date        TEXT    NOT NULL,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_expenses_date     ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
```
