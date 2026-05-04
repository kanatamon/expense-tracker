import { Elysia } from "elysia";

const app = new Elysia().get("/", () => ({ status: "ok" }));

app.listen(3001);

console.log(`🦊 API server running at http://localhost:${app.server?.port}`);
