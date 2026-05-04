import { Database } from "bun:sqlite";
import { validateCreateExpense, type ValidationDetail } from "./validation";

export const VALID_CATEGORIES = ["food", "transport", "accommodation", "other"] as const;
export const VALID_SORT_FIELDS = ["date", "amount"] as const;
export const VALID_SORT_ORDERS = ["asc", "desc"] as const;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validationErrorResponse(errors: ValidationDetail[]): Response {
  return jsonResponse(
    {
      error: "ValidationError",
      message: errors[0].message,
      details: errors,
    },
    400
  );
}

function internalErrorResponse(): Response {
  return jsonResponse(
    {
      error: "InternalError",
      message: "An unexpected error occurred",
    },
    500
  );
}

export function handleHealthCheck(): Response {
  return jsonResponse({ status: "ok" }, 200);
}

export function handleCreateExpense(db: Database, body: Record<string, unknown>): Response {
  try {
    const { valid, errors } = validateCreateExpense(body);

    if (!valid) {
      return validationErrorResponse(errors!);
    }

    const amount = Math.round((body.amount as number) * 100) / 100;
    const category = body.category as string;
    const description = (body.description as string).trim();
    const date = body.date as string;

    const stmt = db.prepare(
      "INSERT INTO expenses (amount, category, description, date) VALUES ($amount, $category, $description, $date)"
    );
    const result = stmt.run({
      $amount: amount,
      $category: category,
      $description: description,
      $date: date,
    });

    const expense = db
      .query("SELECT * FROM expenses WHERE id = $id")
      .get({ $id: Number(result.lastInsertRowid) }) as Record<string, unknown>;

    return jsonResponse(
      {
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        date: expense.date,
        created_at: expense.created_at,
      },
      201
    );
  } catch {
    return internalErrorResponse();
  }
}

export function handleListExpenses(
  db: Database,
  query: Record<string, string | undefined>
): Response {
  try {
    const category = query.category;
    const sortBy =
      query.sort_by && VALID_SORT_FIELDS.includes(query.sort_by as (typeof VALID_SORT_FIELDS)[number])
        ? query.sort_by
        : "date";
    const sortOrder =
      query.sort_order && VALID_SORT_ORDERS.includes(query.sort_order as (typeof VALID_SORT_ORDERS)[number])
        ? query.sort_order
        : "desc";

    let whereClause = "";
    const params: Record<string, string> = {};

    if (category) {
      whereClause = " WHERE category = $category";
      params.$category = category;
    }

    const expensesSql = `SELECT id, amount, category, description, date, created_at FROM expenses${whereClause} ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    const expenses = db.query(expensesSql).all(params) as Array<Record<string, unknown>>;

    const totalSql = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses${whereClause}`;
    const totalRow = db.query(totalSql).get(params) as { total: number };
    const total = Math.round(totalRow.total * 100) / 100;

    let subtotals: Record<string, number>;

    if (category) {
      const catSumSql =
        "SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE category = $category";
      const catRow = db.query(catSumSql).get({ $category: category }) as { sum: number };

      subtotals = {
        food: 0,
        transport: 0,
        accommodation: 0,
        other: 0,
      };
      subtotals[category] = Math.round(catRow.sum * 100) / 100;
    } else {
      const subSql =
        "SELECT category, COALESCE(SUM(amount), 0) as sum FROM expenses GROUP BY category";
      const rows = db.query(subSql).all() as Array<{ category: string; sum: number }>;

      subtotals = {
        food: 0,
        transport: 0,
        accommodation: 0,
        other: 0,
      };
      for (const row of rows) {
        subtotals[row.category] = Math.round(row.sum * 100) / 100;
      }
    }

    return jsonResponse(
      {
        expenses: expenses.map((e) => ({
          id: e.id,
          amount: e.amount,
          category: e.category,
          description: e.description,
          date: e.date,
          created_at: e.created_at,
        })),
        total,
        subtotals,
      },
      200
    );
  } catch {
    return internalErrorResponse();
  }
}

export function handleExportCsv(
  db: Database,
  query: Record<string, string | undefined>
): Response {
  try {
    const category = query.category;
    const sortBy =
      query.sort_by && VALID_SORT_FIELDS.includes(query.sort_by as (typeof VALID_SORT_FIELDS)[number])
        ? query.sort_by
        : "date";
    const sortOrder =
      query.sort_order && VALID_SORT_ORDERS.includes(query.sort_order as (typeof VALID_SORT_ORDERS)[number])
        ? query.sort_order
        : "desc";

    let sql = "SELECT id, amount, category, description, date, created_at FROM expenses";
    const params: Record<string, string> = {};

    if (category) {
      sql += " WHERE category = $category";
      params.$category = category;
    }

    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    const rows = db.query(sql).all(params) as Array<Record<string, unknown>>;

    const header = "id,amount,category,description,date,created_at";
    const csvRows = rows.map((r) => {
      const desc = String(r.description ?? "");
      const escapedDesc =
        desc.includes(",") || desc.includes('"') || desc.includes("\n")
          ? `"${desc.replace(/"/g, '""')}"`
          : desc;
      return `${r.id},${Number(r.amount).toFixed(2)},${r.category},${escapedDesc},${r.date},${r.created_at}`;
    });

    const csv = [header, ...csvRows].join("\n");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="expenses.csv"',
      },
    });
  } catch {
    return internalErrorResponse();
  }
}
