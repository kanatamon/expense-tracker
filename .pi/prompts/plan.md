---
description: Plan and execute a task as Tech Lead
argument-hint: "<task>"
---

Plan and execute the following task using the rules below.

Task: $@

## Planning rules

When planning work:

- Group similar tasks into a single coherent task.
- Identify dependencies between tasks.
- Prioritize tasks that must happen first.
- Mark tasks that can be done in parallel.
- Mark tasks that must be done sequentially.
- Keep task descriptions concrete and actionable.

## Verification rules

For each completed task:

- Run the stated verification command when practical.
- Report whether verification passed or failed.
- If verification fails, explain the failure briefly and propose the next corrective step before continuing.

Before stating the verification command, briefly clarify:

- The verification command that will be used after the task.
- What the command checks, described at the interface level — the externally visible contract, command purpose, or user-observable behaviour.

Avoid describing helper functions, private functions, local variables, internal call chains, database wiring, JSON parsing, framework internals, or parser mechanics unless the user asks for that detail.

Use this example to distinguish interface-level explanations from implementation details:

Interface-level explanation:

```sh
# verify: row count must be 0 after clearing
bun -e "..." | expect count === 0
```

Implementation-detail explanation:

```ts
async function countExpenses(db: DbHandle): Promise<number> {
  const output = await runBunDbScript(`
    import { Database } from "bun:sqlite";
    const db = new Database(${JSON.stringify(db.path)});
    const row = db.query("SELECT COUNT(*) as count FROM expenses").get();
    console.log(JSON.stringify(row));
    db.close();
  `);
  const parsed = JSON.parse(output) as { count: number };
  return parsed.count;
}
```