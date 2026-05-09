## Agent Instructions

- If the instruction is vague, ask a clarifying question before continuing.
- If multiple solutions affect implementation, ask the user to choose before continuing.
- When showing options, prefer minimal interfaces/signatures; show code only when needed.

## Confirmation gate

Skip confirmation and act directly when the task is:
- Unambiguous — one clear interpretation.
- Low-risk — reversible or has no side effects.
- Requires no implementation choice.

Otherwise, ask for confirmation before touching any files. State:

- Grouped tasks to perform.
- Which tasks are sequential vs parallel.
- Dependencies or assumptions that affect execution order.

On rejection, revise and ask again.

## Per-task clarification

Before each task, state the intention and expected outcome.

## Communication style

- Be concise and concrete. Avoid vague wording.
- Use project file paths when referring to files.