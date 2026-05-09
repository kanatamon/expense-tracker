import { expect, test } from "@playwright/test";
import { clearExpenses } from "./fixtures";

test.describe("expense browser flow", () => {
	test.beforeEach(async () => {
		await clearExpenses();
	});

	test.afterEach(async () => {
		await clearExpenses();
	});

	test("create via UI, appears in list", async ({ page }) => {
		await page.goto("/");

		await page.getByRole("button", { name: "+ New Expense" }).click();
		await page.getByLabel("Amount").fill("25.50");
		await page.getByLabel("Category").selectOption("food");
		await page.getByLabel("Description").fill("Lunch at restaurant");
		await page.getByLabel("Date / Time").fill("2026-05-04T12:00");
		await page.getByRole("button", { name: "Submit" }).click();

		const createdExpense = page
			.locator("div")
			.filter({ hasText: "Lunch at restaurant" })
			.filter({ hasText: "฿25.50" })
			.filter({ hasText: "Food" })
			.last();

		await expect(createdExpense).toBeVisible();
	});
});
