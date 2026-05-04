import { describe, expect, it, beforeEach } from "bun:test";
import { createTestDb } from "./db";
import { SqliteExpenseRepository } from "./repository";
import type { CreateExpenseBodyType, ListExpensesQueryType } from "./types";
import { handleCreateExpense, handleListExpenses, handleExportCsv } from "./handlers";

describe("handleCreateExpense", () => {
  let repo: SqliteExpenseRepository;

  beforeEach(() => {
    const db = createTestDb();
    repo = new SqliteExpenseRepository(db);
  });

  it("creates an expense and returns 201 with correct shape", async () => {
    const body: CreateExpenseBodyType = {
      amount: 450.6,
      category: "food",
      description: "Team lunch at CentralWorld",
      date: "2026-05-04T12:30:00.000Z",
    };

    const res = handleCreateExpense(repo, body);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(typeof json.id).toBe("number");
    expect(json.amount).toBe(450.6);
    expect(json.category).toBe("food");
    expect(json.description).toBe("Team lunch at CentralWorld");
    expect(json.date).toBe("2026-05-04T12:30:00.000Z");
    expect(typeof json.created_at).toBe("string");
  });

  it("trims description whitespace", async () => {
    const body: CreateExpenseBodyType = {
      amount: 100,
      category: "other",
      description: "  padded  ",
      date: "2026-05-04T12:30:00.000Z",
    };

    const res = handleCreateExpense(repo, body);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.description).toBe("padded");
  });

  it("rounds amount to 2 decimal places", async () => {
    const body: CreateExpenseBodyType = {
      amount: 100.555,
      category: "other",
      description: "test",
      date: "2026-05-04T12:30:00.000Z",
    };

    const res = handleCreateExpense(repo, body);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.amount).toBe(100.56);
  });
});

function seedExpenses(repo: SqliteExpenseRepository) {
  const seedData: CreateExpenseBodyType[] = [
    {
      amount: 100.0,
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
      amount: 500.0,
      category: "accommodation",
      description: "Hotel",
      date: "2026-04-01T12:00:00.000Z",
    },
  ];

  for (const data of seedData) {
    repo.insert(data);
  }
}

describe("handleListExpenses", () => {
  let repo: SqliteExpenseRepository;

  beforeEach(() => {
    const db = createTestDb();
    repo = new SqliteExpenseRepository(db);
    seedExpenses(repo);
  });

  it("returns expenses sorted by date desc by default", async () => {
    const query: ListExpensesQueryType = {};
    const res = handleListExpenses(repo, query);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expenses.length).toBe(4);
    expect(body.expenses[0].date).toBe("2026-04-01T12:00:00.000Z");
    expect(body.expenses[3].date).toBe("2026-01-01T12:00:00.000Z");
  });

  it("computes total correctly", async () => {
    const query: ListExpensesQueryType = {};
    const res = handleListExpenses(repo, query);
    const body = await res.json();
    // 100 + 250.5 + 75.25 + 500 = 925.75
    expect(body.total).toBe(925.75);
  });

  it("computes subtotals for all 4 categories", async () => {
    const query: ListExpensesQueryType = {};
    const res = handleListExpenses(repo, query);
    const body = await res.json();
    expect(body.subtotals).toEqual({
      food: 175.25,
      transport: 250.5,
      accommodation: 500,
      other: 0,
    });
  });

  it("filters by category", async () => {
    const query: ListExpensesQueryType = { category: "food" };
    const res = handleListExpenses(repo, query);
    const body = await res.json();
    expect(body.expenses.length).toBe(2);
    expect(body.total).toBe(175.25);
    expect(body.subtotals).toEqual({
      food: 175.25,
      transport: 0,
      accommodation: 0,
      other: 0,
    });
  });

  it("sorts by amount asc", async () => {
    const query: ListExpensesQueryType = { sort_by: "amount", sort_order: "asc" };
    const res = handleListExpenses(repo, query);
    const body = await res.json();
    const amounts = body.expenses.map((e: { amount: number }) => e.amount);
    expect(amounts).toEqual([75.25, 100, 250.5, 500]);
  });

  it("sorts by amount desc", async () => {
    const query: ListExpensesQueryType = { sort_by: "amount", sort_order: "desc" };
    const res = handleListExpenses(repo, query);
    const body = await res.json();
    const amounts = body.expenses.map((e: { amount: number }) => e.amount);
    expect(amounts).toEqual([500, 250.5, 100, 75.25]);
  });
});

describe("handleExportCsv", () => {
  let repo: SqliteExpenseRepository;

  beforeEach(() => {
    const db = createTestDb();
    repo = new SqliteExpenseRepository(db);
    seedExpenses(repo);
  });

  it("returns CSV with correct headers and 4 data rows", async () => {
    const query: ListExpensesQueryType = {};
    const res = handleExportCsv(repo, query);

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/csv");
    expect(res.headers.get("Content-Disposition")).toBe(
      'attachment; filename="expenses.csv"'
    );
    const text = await res.text();
    const lines = text.split("\n");
    expect(lines[0]).toBe("id,amount,category,description,date,created_at");
    // 4 data rows + header = 5 lines, last line may be empty from trailing newline
    expect(lines.filter((l) => l.length > 0).length).toBe(5);
  });

  it("returns filtered CSV by category", async () => {
    const query: ListExpensesQueryType = { category: "transport" };
    const res = handleExportCsv(repo, query);
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.length > 0);
    // Header + 1 data row
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("transport");
  });
});
