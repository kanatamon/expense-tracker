import { createApp } from "./app";
import { initDb } from "./db";
import { ExpenseRepository } from "./repository";

const db = initDb();
const repo = new ExpenseRepository(db);
const app = createApp(repo);
app.listen(3001);
console.log(`🦊 API server running at http://localhost:${app.server?.port}`);
