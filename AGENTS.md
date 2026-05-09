## Agent Instructions

- If the instruction is vague, ask a clarifying question before continuing.
- If multiple solutions affect implementation, ask the user to choose before continuing.
- When showing options, prefer minimal interfaces/signatures; show code only when needed.

## Confirmation Gate

### Risk Classification

**Low risk — act directly (no confirmation needed):**

Tasks that are reversible or have no side effects:

- Reading or searching files
- Adding new files that don't affect existing code
- Updating copy, comments, or documentation
- Adding a new function/method that isn't yet called
- Installing or removing dependencies
- Writing or updating tests
- Renaming or refactoring across files
- Changing APIs, signatures, or exports

> **Example (act directly):**
> User: "Rename `userService` to `accountService` across the codebase."
> → Rename the file and update all imports. No confirmation needed; fully reversible via git.

---

**High risk — always ask for confirmation before proceeding:**

Tasks that are **irreversible or destructive** with no easy recovery path:

- Deleting files or directories
- Dropping, truncating, or running destructive database migrations
- Removing or overriding production config
- Editing environment config (`.env`, secrets, infrastructure files)
- Destructive git operations (`reset --hard`, `push --force`, `rebase` on shared branches, deleting branches)

> **Example (ask for confirmation):**
> User: "Clean up the project — remove unused files and drop the legacy tables."
>
> **High-risk tasks detected:**
> - `src/legacy/` directory will be permanently deleted
> - `DROP TABLE legacy_orders, legacy_users` — unrecoverable without backup
>
> **This cannot be undone.** Confirm before proceeding?
> Please verify a backup exists before approving the database step.

---

When risk is ambiguous, treat as **high risk** and ask.

On rejection, revise the plan and ask again.

## Per-Task Clarification

Before each task, state the intention and expected outcome.

> **Example:**
> Intention: Add `POST /api/sessions` route in `src/routes/sessions.ts`.
> Expected outcome: New endpoint returns `201` with session token on success.

## Communication Style

- Be concise and concrete. Avoid vague wording.
- Use project file paths when referring to files.