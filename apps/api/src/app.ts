import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import type { ExpenseRepository } from "./repository";
import {
	CreateExpenseBody,
	ListExpensesQuery,
	ExpenseSchema,
	ExpenseListResponseSchema,
	ApiError,
} from "./types";
import { handleHealthCheck } from "./handlers/health";
import { createExpense, listExpenses, exportCsv } from "./handlers/expense";

type CreateAppOptions = {
	serveStatic?: boolean;
	staticDir?: string;
};

const contentTypes: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".ico": "image/x-icon",
};

type StaticHandlerContext = {
	request: Request;
	set: {
		status?: number | string;
		headers: Record<string, string | number>;
	};
};

function createStaticFileHandler(staticDir: string) {
	const root = normalize(staticDir);
	const indexPath = join(root, "index.html");

	return ({ request, set }: StaticHandlerContext) => {
		const requestedPath = new URL(request.url).pathname.replace(/^\//, "");
		const normalizedPath = normalize(requestedPath).replace(
			/^(\.\.[/\\])+/,
			"",
		);
		const candidatePath = join(root, normalizedPath);
		const filePath =
			existsSync(candidatePath) && statSync(candidatePath).isFile()
				? candidatePath
				: indexPath;

		if (!existsSync(filePath)) {
			set.status = 404;
			return "Frontend build not found. Run `bun --cwd apps/web run build` first.";
		}

		set.headers["Content-Type"] =
			contentTypes[extname(filePath)] ?? "application/octet-stream";
		return Bun.file(filePath);
	};
}

// Return type omitted intentionally: Eden Treaty needs the concrete
// Elysia instance type (with route schemas) for full type inference.
// A plain `Elysia` annotation erases the schema information.
export function createApp(
	repo: ExpenseRepository,
	options: CreateAppOptions = {},
) {
	const staticDir = options.staticDir ?? join(process.cwd(), "apps/web/dist");
	const staticFileHandler = createStaticFileHandler(staticDir);
	const app = new Elysia()
		.use(cors())
		.decorate("repo", repo)
		.onError(({ code, error, set }) => {
			if (code === "NOT_FOUND") {
				set.status = 404;
				return { error: "NotFound", message: String(error) };
			}
			if (code === "PARSE") {
				set.status = 400;
				return { error: "ParseError", message: error.message };
			}
			if (code === "VALIDATION") {
				// Let Elysia use default validation error response
				return;
			}
			set.status = 500;
			return {
				error: "InternalError",
				message: "An unexpected error occurred",
			};
		})
		.get("/", options.serveStatic ? staticFileHandler : handleHealthCheck)
		.post("/api/expenses", createExpense, {
			body: CreateExpenseBody,
			response: { 201: ExpenseSchema, 500: ApiError },
		})
		.get("/api/expenses", listExpenses, {
			query: ListExpensesQuery,
			response: { 200: ExpenseListResponseSchema, 500: ApiError },
		})
		.get("/api/expenses/csv", exportCsv, {
			query: ListExpensesQuery,
		});

	if (!options.serveStatic) {
		return app;
	}

	return app.get("/assets/*", staticFileHandler).get("/*", staticFileHandler);
}

export type App = ReturnType<typeof createApp>;
