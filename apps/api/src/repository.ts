import { Database } from "bun:sqlite";
import type { CreateExpenseBodyType, ListExpensesQueryType, ExpenseRowType, ExpenseListResponseType } from "./types";

export class ExpenseRepository {
  constructor(private db: Database) {}

  create(body: CreateExpenseBodyType): ExpenseRowType {
    const amount = Math.round(body.amount * 100) / 100;
    const description = body.description.trim();

    const stmt = this.db.prepare(
      "INSERT INTO expenses (amount, category, description, date) VALUES ($amount, $category, $description, $date)"
    );
    const result = stmt.run({
      $amount: amount,
      $category: body.category,
      $description: description,
      $date: body.date,
    });

    return this.db
      .query("SELECT * FROM expenses WHERE id = $id")
      .get({ $id: Number(result.lastInsertRowid) }) as ExpenseRowType;
  }

  list(query: ListExpensesQueryType): ExpenseListResponseType {
    const category = query.category;
    const sortBy = query.sort_by ?? "date";
    const sortOrder = query.sort_order ?? "desc";

    let whereClause = "";
    const params: Record<string, string> = {};

    if (category) {
      whereClause = " WHERE category = $category";
      params.$category = category;
    }

    const expensesSql = `SELECT id, amount, category, description, date, created_at FROM expenses${whereClause} ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;
    const expenses = this.db.query(expensesSql).all(params) as ExpenseRowType[];

    const totalSql = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses${whereClause}`;
    const totalRow = this.db.query(totalSql).get(params) as { total: number };
    const total = Math.round(totalRow.total * 100) / 100;

    const allCategories = ["food", "transport", "accommodation", "other"] as const;

    let subtotals: Record<string, number>;

    if (category) {
      const catSumSql =
        "SELECT COALESCE(SUM(amount), 0) as sum FROM expenses WHERE category = $category";
      const catRow = this.db.query(catSumSql).get({ $category: category }) as { sum: number };

      subtotals = { food: 0, transport: 0, accommodation: 0, other: 0 };
      subtotals[category] = Math.round(catRow.sum * 100) / 100;
    } else {
      const subSql =
        "SELECT category, COALESCE(SUM(amount), 0) as sum FROM expenses GROUP BY category";
      const rows = this.db.query(subSql).all() as Array<{ category: string; sum: number }>;

      subtotals = { food: 0, transport: 0, accommodation: 0, other: 0 };
      for (const row of rows) {
        if (allCategories.includes(row.category as typeof allCategories[number])) {
          subtotals[row.category] = Math.round(row.sum * 100) / 100;
        }
      }
    }

    return { expenses, total, subtotals };
  }

  exportCsv(query: ListExpensesQueryType): string {
    const category = query.category;
    const sortBy = query.sort_by ?? "date";
    const sortOrder = query.sort_order ?? "desc";

    let sql = "SELECT id, amount, category, description, date, created_at FROM expenses";
    const params: Record<string, string> = {};

    if (category) {
      sql += " WHERE category = $category";
      params.$category = category;
    }

    sql += ` ORDER BY ${sortBy} ${sortOrder.toUpperCase()}`;

    const rows = this.db.query(sql).all(params) as ExpenseRowType[];

    const header = "id,amount,category,description,date,created_at";
    const csvRows = rows.map((r) => {
      const desc = String(r.description ?? "");
      const escapedDesc =
        desc.includes(",") || desc.includes('"') || desc.includes("\n")
          ? `"${desc.replace(/"/g, '""')}"`
          : desc;
      return `${r.id},${Number(r.amount).toFixed(2)},${r.category},${escapedDesc},${r.date},${r.created_at}`;
    });

    return [header, ...csvRows].join("\n");
  }
}
