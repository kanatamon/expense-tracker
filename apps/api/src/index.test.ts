import { describe, expect, it, beforeEach } from "bun:test";
import { createTestDb } from "./db";
import { ExpenseRepository } from "./repository";
import { createApp } from "./app";
import type { CreateExpenseBodyType, ListExpensesQueryType } from "./types";
import type { Elysia } from "elysia";

function createTestApp() {
  const db = createTestDb();
  const repo = new ExpenseRepository(db);
  const app = createApp(repo);
  return { app, repo, db };
}

// ─── Health check ────────────────────────────────────────────────

describe("GET / - Health check", () => {
  it("returns 200 with status ok", async () => {
    const { app } = createTestApp();
    const req = new Request("http://localhost/");
    const res = await app.handle(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ status: "ok" });
  });
});

// ─── POST /api/expenses ──────────────────────────────────────────

function createExpenseBody(
  overrides: Partial<CreateExpenseBodyType> = {}
): CreateExpenseBodyType {
  return {
    amount: 450.6,
    category: "food",
    description: "Team lunch at CentralWorld",
    date: "2026-05-04T12:30:00.000Z",
    ...overrides,
  };
}

function postExpense(
  app: Elysia,
  body: CreateExpenseBodyType
): Promise<Response> {
  const req = new Request("http://localhost/api/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return app.handle(req);
}

describe("POST /api/expenses", () => {
  it("creates an expense and returns 201 with correct shape", async () => {
    const { app } = createTestApp();
    const body = createExpenseBody();
    const res = await postExpense(app, body);

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
    const { app } = createTestApp();
    const body = createExpenseBody({ description: "  padded  " });
    const res = await postExpense(app, body);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.description).toBe("padded");
  });

  it("rounds amount to 2 decimal places", async () => {
    const { app } = createTestApp();
    const body = createExpenseBody({ amount: 100.555 });
    const res = await postExpense(app, body);

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.amount).toBe(100.56);
  });

  it("rejects missing required fields (empty body)", async () => {
    const { app } = createTestApp();
    const req = new Request("http://localhost/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await app.handle(req);
    expect(res.status).toBe(422);
  });

  it("rejects invalid category", async () => {
    const { app } = createTestApp();
    const body = createExpenseBody({ category: "invalid" as any });
    const req = new Request("http://localhost/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await app.handle(req);
    expect(res.status).toBe(422);
  });

  it("rejects negative amount", async () => {
    const { app } = createTestApp();
    const body = createExpenseBody({ amount: -10 });
    const req = new Request("http://localhost/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const res = await app.handle(req);
    expect(res.status).toBe(422);
  });
});

// ─── Seed helper ─────────────────────────────────────────────────

function seedExpenses(repo: ExpenseRepository) {
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
    repo.create(data);
  }
}

async function getExpenses(
  app: Elysia,
  queryParams: Record<string, string> = {}
): Promise<Response> {
  const params = new URLSearchParams(queryParams).toString();
  const url = params
    ? `http://localhost/api/expenses?${params}`
    : "http://localhost/api/expenses";
  const req = new Request(url);
  return app.handle(req);
}

// ─── GET /api/expenses ───────────────────────────────────────────

describe("GET /api/expenses", () => {
  let app: Elysia;
  let repo: ExpenseRepository;

  beforeEach(() => {
    const ctx = createTestApp();
    app = ctx.app;
    repo = ctx.repo;
    seedExpenses(repo);
  });

  it("returns expenses sorted by date desc by default", async () => {
    const res = await getExpenses(app);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expenses.length).toBe(4);
    expect(body.expenses[0].date).toBe("2026-04-01T12:00:00.000Z");
    expect(body.expenses[3].date).toBe("2026-01-01T12:00:00.000Z");
  });

  it("computes total correctly", async () => {
    const res = await getExpenses(app);
    const body = await res.json();
    // 100 + 250.5 + 75.25 + 500 = 925.75
    expect(body.total).toBe(925.75);
  });

  it("computes subtotals for all 4 categories", async () => {
    const res = await getExpenses(app);
    const body = await res.json();
    expect(body.subtotals).toEqual({
      food: 175.25,
      transport: 250.5,
      accommodation: 500,
      other: 0,
    });
  });

  it("filters by category", async () => {
    const res = await getExpenses(app, { category: "food" });
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
    const res = await getExpenses(app, {
      sort_by: "amount",
      sort_order: "asc",
    });
    const body = await res.json();
    const amounts = body.expenses.map(
      (e: { amount: number }) => e.amount
    );
    expect(amounts).toEqual([75.25, 100, 250.5, 500]);
  });

  it("sorts by amount desc", async () => {
    const res = await getExpenses(app, {
      sort_by: "amount",
      sort_order: "desc",
    });
    const body = await res.json();
    const amounts = body.expenses.map(
      (e: { amount: number }) => e.amount
    );
    expect(amounts).toEqual([500, 250.5, 100, 75.25]);
  });

  it("rejects invalid sort_by", async () => {
    const { app: freshApp } = createTestApp();
    const res = await getExpenses(freshApp, { sort_by: "invalid" });
    expect(res.status).toBe(422);
  });

  it("rejects invalid sort_order", async () => {
    const { app: freshApp } = createTestApp();
    const res = await getExpenses(freshApp, { sort_order: "invalid" });
    expect(res.status).toBe(422);
  });
});

// ─── GET /api/expenses/csv ───────────────────────────────────────

async function getCsv(
  app: Elysia,
  queryParams: Record<string, string> = {}
): Promise<Response> {
  const params = new URLSearchParams(queryParams).toString();
  const url = params
    ? `http://localhost/api/expenses/csv?${params}`
    : "http://localhost/api/expenses/csv";
  const req = new Request(url);
  return app.handle(req);
}

describe("GET /api/expenses/csv", () => {
  let app: Elysia;
  let repo: ExpenseRepository;

  beforeEach(() => {
    const ctx = createTestApp();
    app = ctx.app;
    repo = ctx.repo;
    seedExpenses(repo);
  });

  it("returns CSV with correct headers and 4 data rows", async () => {
    const res = await getCsv(app);

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
    const res = await getCsv(app, { category: "transport" });
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.length > 0);
    // Header + 1 data row
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("transport");
  });

  it("rejects invalid category in CSV export", async () => {
    const { app: freshApp } = createTestApp();
    const res = await getCsv(freshApp, { category: "invalid" });
    expect(res.status).toBe(422);
  });
});
