import { createApp } from "./app";
import { initDb } from "./db";

const db = initDb();
const app = createApp(db);
app.listen(3001);
console.log(`🦊 API server running at http://localhost:${app.server?.port}`);
