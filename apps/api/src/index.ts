import { createApp } from "./app";
import { initDb } from "./db";
import { SqliteExpenseRepository } from "./repository";

const db = initDb();
const repo = new SqliteExpenseRepository(db);
const app = createApp(repo);
app.listen(3001);
console.log(`🦊 API server running at http://localhost:${app.server?.port}`);
