import { expect, type APIRequestContext, test } from "@playwright/test";
import { clearExpenses, sampleExpenses, seedExpenses } from "./fixtures";

const subtotals = {
	food: 175.25,
	transport: 250.5,
	accommodation: 500,
	other: 0,
};

async function createExpense(
	request: APIRequestContext,
	body: Record<string, unknown>,
) {
	return request.post("/api/expenses", { data: body });
}

test.describe("expense API", () => {
	test.beforeEach(async () => {
		await seedExpenses(null, sampleExpenses);
	});

	test.afterEach(async () => {
		await clearExpenses();
	});

	test("list with no filter returns all expenses with total and subtotals", async ({
		request,
	}) => {
		const response = await request.get("/api/expenses");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.expenses).toHaveLength(4);
		expect(body.total).toBe(925.75);
		expect(body.subtotals).toEqual(subtotals);
	});

	test("list with category filter returns only food expenses", async ({
		request,
	}) => {
		const response = await request.get("/api/expenses?category=food");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.expenses).toHaveLength(2);
		expect(
			body.expenses.every(
				(expense: { category: string }) => expense.category === "food",
			),
		).toBe(true);
		expect(body.total).toBe(175.25);
		expect(body.subtotals).toEqual({
			food: 175.25,
			transport: 0,
			accommodation: 0,
			other: 0,
		});
	});

	test("list sorted by date desc by default", async ({ request }) => {
		const response = await request.get("/api/expenses");
		const body = await response.json();
		expect(
			body.expenses.map(
				(expense: { description: string }) => expense.description,
			),
		).toEqual(["Hotel", "Dinner", "Taxi", "Lunch"]);
	});

	test("list sorted by amount asc", async ({ request }) => {
		const response = await request.get(
			"/api/expenses?sort_by=amount&sort_order=asc",
		);
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(
			body.expenses.map((expense: { amount: number }) => expense.amount),
		).toEqual([75.25, 100, 250.5, 500]);
	});

	test("CSV export returns text/csv with headers and rows", async ({
		request,
	}) => {
		const response = await request.get("/api/expenses/csv");
		expect(response.status()).toBe(200);
		expect(response.headers()["content-type"]).toContain("text/csv");

		const csv = await response.text();
		const lines = csv.split("\n");
		expect(lines[0]).toBe("id,amount,category,description,date,created_at");
		expect(lines).toHaveLength(5);
		expect(csv).toContain("Hotel");
		expect(csv).toContain("Lunch");
	});

	test("subtotals are computed from filtered expenses per category", async ({
		request,
	}) => {
		const response = await request.get("/api/expenses?category=transport");
		const body = await response.json();
		expect(body.total).toBe(250.5);
		expect(body.subtotals).toEqual({
			food: 0,
			transport: 250.5,
			accommodation: 0,
			other: 0,
		});
	});

	test("validation rejects invalid create payloads", async ({ request }) => {
		const valid = {
			amount: 10,
			category: "food",
			description: "Valid expense",
			date: "2026-01-01T00:00:00.000Z",
		};

		const invalidPayloads = [
			{ ...valid, amount: 0 },
			{ ...valid, amount: -1 },
			{ ...valid, description: "" },
			{ ...valid, description: "x".repeat(501) },
			{ ...valid, category: "invalid" },
			{ ...valid, date: "not-a-date" },
		];

		for (const payload of invalidPayloads) {
			const response = await createExpense(request, payload);
			expect(response.status()).toBe(400);
		}
	});

	test("list with no data returns empty totals", async ({ request }) => {
		await clearExpenses();
		const response = await request.get("/api/expenses");
		expect(response.status()).toBe(200);

		const body = await response.json();
		expect(body.expenses).toEqual([]);
		expect(body.total).toBe(0);
		expect(body.subtotals).toEqual({
			food: 0,
			transport: 0,
			accommodation: 0,
			other: 0,
		});
	});

	test("CSV export with no data returns only header row", async ({
		request,
	}) => {
		await clearExpenses();
		const response = await request.get("/api/expenses/csv");
		expect(response.status()).toBe(200);
		expect(await response.text()).toBe(
			"id,amount,category,description,date,created_at",
		);
	});

	test("list with nonexistent category is rejected by validation", async ({
		request,
	}) => {
		const response = await request.get("/api/expenses?category=nonexistent");
		expect(response.status()).toBe(400);
	});

	test("health check returns ok", async ({ request }) => {
		const response = await request.get("/");
		expect(response.status()).toBe(200);
		expect(await response.json()).toEqual({ status: "ok" });
	});
});
