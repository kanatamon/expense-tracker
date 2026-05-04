import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDb } from "./db";
import { handleCreateExpense, handleListExpenses, handleExportCsv } from "./handlers";

describe("handleCreateExpense", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it("creates an expense and returns 201 with correct shape", async () => {
    const res = handleCreateExpense(db, {
      amount: 450.6,
      category: "food",
      description: "Team lunch at CentralWorld",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(typeof body.id).toBe("number");
    expect(body.amount).toBe(450.6);
    expect(body.category).toBe("food");
    expect(body.description).toBe("Team lunch at CentralWorld");
    expect(body.date).toBe("2026-05-04T12:30:00.000Z");
    expect(typeof body.created_at).toBe("string");
  });

  it("returns 400 when amount is missing", async () => {
    const res = handleCreateExpense(db, {
      category: "food",
      description: "Test",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
    expect(body.details[0].field).toBe("amount");
  });

  it("returns 400 when amount <= 0", async () => {
    const res = handleCreateExpense(db, {
      amount: 0,
      category: "food",
      description: "Test",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });

  it("returns 400 when amount > 999999999", async () => {
    const res = handleCreateExpense(db, {
      amount: 1_000_000_000,
      category: "food",
      description: "Test",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });

  it("returns 400 when amount has more than 2 decimal places", async () => {
    const res = handleCreateExpense(db, {
      amount: 100.123,
      category: "food",
      description: "Test",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });

  it("returns 400 for invalid category", async () => {
    const res = handleCreateExpense(db, {
      amount: 100,
      category: "invalid",
      description: "Test",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });

  it("returns 400 for empty description", async () => {
    const res = handleCreateExpense(db, {
      amount: 100,
      category: "food",
      description: "",
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });

  it("returns 400 for description exceeding 500 chars", async () => {
    const res = handleCreateExpense(db, {
      amount: 100,
      category: "food",
      description: "x".repeat(501),
      date: "2026-05-04T12:30:00.000Z",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });

  it("returns 400 for invalid date", async () => {
    const res = handleCreateExpense(db, {
      amount: 100,
      category: "food",
      description: "Test",
      date: "not-a-date",
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("ValidationError");
  });
});

function seedExpenses(db: Database) {
  db.run("DELETE FROM expenses");
  const insert = db.prepare(
    "INSERT INTO expenses (amount, category, description, date, created_at) VALUES ($amount, $category, $description, $date, $created_at)"
  );
  insert.run({
    $amount: 100.0,
    $category: "food",
    $description: "Lunch",
    $date: "2026-01-01T12:00:00.000Z",
    $created_at: "2026-01-01T12:00:00.000Z",
  });
  insert.run({
    $amount: 250.5,
    $category: "transport",
    $description: "Taxi",
    $date: "2026-02-01T12:00:00.000Z",
    $created_at: "2026-02-01T12:00:00.000Z",
  });
  insert.run({
    $amount: 75.25,
    $category: "food",
    $description: "Dinner",
    $date: "2026-03-01T12:00:00.000Z",
    $created_at: "2026-03-01T12:00:00.000Z",
  });
  insert.run({
    $amount: 500.0,
    $category: "accommodation",
    $description: "Hotel",
    $date: "2026-04-01T12:00:00.000Z",
    $created_at: "2026-04-01T12:00:00.000Z",
  });
}

describe("handleListExpenses", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    seedExpenses(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns expenses sorted by date desc by default", async () => {
    const res = handleListExpenses(db, {});

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.expenses.length).toBe(4);
    expect(body.expenses[0].date).toBe("2026-04-01T12:00:00.000Z");
    expect(body.expenses[3].date).toBe("2026-01-01T12:00:00.000Z");
  });

  it("computes total correctly", async () => {
    const res = handleListExpenses(db, {});
    const body = await res.json();
    // 100 + 250.5 + 75.25 + 500 = 925.75
    expect(body.total).toBe(925.75);
  });

  it("computes subtotals for all 4 categories", async () => {
    const res = handleListExpenses(db, {});
    const body = await res.json();
    expect(body.subtotals).toEqual({
      food: 175.25,
      transport: 250.5,
      accommodation: 500,
      other: 0,
    });
  });

  it("filters by category", async () => {
    const res = handleListExpenses(db, { category: "food" });
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
    const res = handleListExpenses(db, { sort_by: "amount", sort_order: "asc" });
    const body = await res.json();
    const amounts = body.expenses.map((e: { amount: number }) => e.amount);
    expect(amounts).toEqual([75.25, 100, 250.5, 500]);
  });

  it("sorts by amount desc", async () => {
    const res = handleListExpenses(db, { sort_by: "amount", sort_order: "desc" });
    const body = await res.json();
    const amounts = body.expenses.map((e: { amount: number }) => e.amount);
    expect(amounts).toEqual([500, 250.5, 100, 75.25]);
  });
});

describe("handleExportCsv", () => {
  let db: Database;

  beforeEach(() => {
    db = createTestDb();
    seedExpenses(db);
  });

  afterEach(() => {
    db.close();
  });

  it("returns CSV with correct headers and 4 data rows", async () => {
    const res = handleExportCsv(db, {});

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
    const res = handleExportCsv(db, { category: "transport" });
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.length > 0);
    // Header + 1 data row
    expect(lines.length).toBe(2);
    expect(lines[1]).toContain("transport");
  });
});
