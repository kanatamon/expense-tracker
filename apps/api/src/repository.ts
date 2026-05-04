import { Database } from "bun:sqlite";
import type {
  CreateExpenseBodyType,
  ListExpensesQueryType,
  ExpenseRowType,
  CategoryEnumType,
} from "./types";

export interface ExpenseRepository {
  insert(input: CreateExpenseBodyType): ExpenseRowType;
  findAll(query: ListExpensesQueryType): ExpenseRowType[];
  totalByCategory(category?: CategoryEnumType): number;
  subtotalsByCategory(category?: CategoryEnumType): Record<CategoryEnumType, number>;
  exportCsv(query: ListExpensesQueryType): string;
}

type FilterResult = { whereClause: string; params: Record<string, string> };

export class SqliteExpenseRepository implements ExpenseRepository {
  constructor(private db: Database) {}

  private buildFilter(category?: CategoryEnumType): FilterResult {
    if (!category) return { whereClause: "", params: {} };
    return {
      whereClause: " WHERE category = $category",
      params: { $category: category },
    };
  }

  private buildOrder(sortBy: string, sortOrder: string): string {
    const safeSortBy = sortBy === "amount" ? "amount" : "date";
    const safeSortOrder = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";
    return ` ORDER BY ${safeSortBy} ${safeSortOrder}`;
  }

  insert(input: CreateExpenseBodyType): ExpenseRowType {
    const amount = Math.round(input.amount * 100) / 100;
    const description = input.description.trim();

    const stmt = this.db.prepare(
      "INSERT INTO expenses (amount, category, description, date) VALUES ($amount, $category, $description, $date)"
    );
    const result = stmt.run({
      $amount: amount,
      $category: input.category,
      $description: description,
      $date: input.date,
    });

    return this.db
      .query("SELECT * FROM expenses WHERE id = $id")
      .get({ $id: Number(result.lastInsertRowid) }) as ExpenseRowType;
  }

  findAll(query: ListExpensesQueryType): ExpenseRowType[] {
    const { whereClause, params } = this.buildFilter(query.category);
    const orderClause = this.buildOrder(query.sort_by ?? "date", query.sort_order ?? "desc");
    const sql = `SELECT id, amount, category, description, date, created_at FROM expenses${whereClause}${orderClause}`;
    return this.db.query(sql).all(params) as ExpenseRowType[];
  }

  totalByCategory(category?: CategoryEnumType): number {
    const { whereClause, params } = this.buildFilter(category);
    const sql = `SELECT COALESCE(SUM(amount), 0) as total FROM expenses${whereClause}`;
    const row = this.db.query(sql).get(params) as { total: number };
    return Math.round(row.total * 100) / 100;
  }

  subtotalsByCategory(category?: CategoryEnumType): Record<CategoryEnumType, number> {
    const allCategories: CategoryEnumType[] = ["food", "transport", "accommodation", "other"];
    const defaults: Record<CategoryEnumType, number> = {
      food: 0,
      transport: 0,
      accommodation: 0,
      other: 0,
    };

    if (category) {
      const { whereClause, params } = this.buildFilter(category);
      const sql = `SELECT COALESCE(SUM(amount), 0) as sum FROM expenses${whereClause}`;
      const row = this.db.query(sql).get(params) as { sum: number };
      return { ...defaults, [category]: Math.round(row.sum * 100) / 100 };
    }

    const sql =
      "SELECT category, COALESCE(SUM(amount), 0) as sum FROM expenses GROUP BY category";
    const rows = this.db.query(sql).all() as Array<{ category: string; sum: number }>;
    const result = { ...defaults };
    for (const row of rows) {
      if (allCategories.includes(row.category as CategoryEnumType)) {
        result[row.category as CategoryEnumType] = Math.round(row.sum * 100) / 100;
      }
    }
    return result;
  }

  exportCsv(query: ListExpensesQueryType): string {
    const { whereClause, params } = this.buildFilter(query.category);
    const orderClause = this.buildOrder(query.sort_by ?? "date", query.sort_order ?? "desc");
    const sql = `SELECT id, amount, category, description, date, created_at FROM expenses${whereClause}${orderClause}`;
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
