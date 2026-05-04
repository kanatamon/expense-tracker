# Infrastructure Contract

## Linting (oxlint)

### Config file

Root `.oxlintrc.json`:

```jsonc
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["typescript", "oxc", "import", "vitest"],
  "categories": {
    "correctness": "error",
    "suspicious": "warn"
  },
  "rules": {
    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-assertions": ["error", { "assertionStyle": "never" }]
  },
  "overrides": [
    {
      "files": ["apps/web/**/*.{ts,tsx}"],
      "env": { "browser": true }
    },
    {
      "files": ["**/*.test.{ts,tsx}"],
      "plugins": ["vitest"]
    }
  ]
}
```

### Key rules

| Rule | What it bans |
|---|---|
| `typescript/no-explicit-any` | Every `any` type annotation (`const x: any`, `function f(): any`, `Array<any>`) |
| `typescript/consistent-type-assertions` with `assertionStyle: "never"` | Every `as` type assertion (`x as T`, `<T>x`) |

`satisfies` operator is allowed (it's a type annotation, not a type assertion).

### CLI commands

```bash
bun run lint        # check
bun run lint:fix    # auto-fix (applies fixToUnknown: any → unknown)
```

---

## Type checking

```bash
bun run typecheck         # run both
bun run typecheck:api     # cd apps/api && tsc --noEmit
bun run typecheck:web     # cd apps/web && tsc --noEmit
```

Both apps already have `strict: true` in their tsconfigs.
`apps/web/tsconfig.json` additionally has `noUnusedLocals: true` and `noUnusedParameters: true`.

---

## Testing

```bash
bun run test              # run both
bun run test:api          # bun --cwd apps/api test
bun run test:web          # bun --cwd apps/web test
```

---

## Root package.json scripts

Jsonc format (root `package.json`):

```jsonc
{
  "name": "expense-tracker",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:api": "bun --cwd apps/api dev",
    "dev:web": "bun --cwd apps/web dev",
    "test": "bun run test:api && bun run test:web",
    "test:api": "bun --cwd apps/api test",
    "test:web": "bun --cwd apps/web test",
    "typecheck": "bun run typecheck:api && bun run typecheck:web",
    "typecheck:api": "cd apps/api && tsc --noEmit",
    "typecheck:web": "cd apps/web && tsc --noEmit",
    "lint": "oxlint",
    "lint:fix": "oxlint --fix",
    "prepare": "husky"
  }
}
```

---

## Dependencies (root workspace)

```bash
bun add -D oxlint husky
```

---

## Git hooks (Husky)

### `.husky/pre-commit`

```bash
bun run lint
```

Triggers: every `git commit`
Effect: blocks commit if any `any` type or `as` cast is found
Latency: ~50ms

### `.husky/pre-push`

```bash
bun run typecheck
bun run test
```

Triggers: every `git push`
Effect: blocks push if `tsc --noEmit` or tests fail
Latency: ~3–5s

---

## CI (GitHub Actions)

### `.github/workflows/ci.yml`

Runs on:
- `push` to `main`
- `pull_request` to `main`

Jobs:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun run lint

  typecheck:
    runs-on: ubuntu-latest
    needs: lint
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun run typecheck

  test:
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install
      - run: bun run test
```

Jobs are sequential (`lint → typecheck → test`) to fail fast — don't waste CI minutes on tests if lint already failed.

---

## Hook + CI consistency

The same commands run locally and in CI:

| Guard | Local (Husky) | CI |
|---|---|---|
| oxlint | `pre-commit` | `lint` job |
| tsc | `pre-push` | `typecheck` job |
| tests | `pre-push` | `test` job |

No divergence between local gates and CI gates.

---

## Why not on `pre-commit`

- **typecheck (~3s):** Too slow for frequent WIP commits — invites `--no-verify` abuse
- **test (~3s):** Same — tests should gate what's shared, not what's saved locally
- **oxlint (~50ms):** Fast enough for every commit — catches the high-signal `any`/`as` violations instantly

---

## Installation one-liner

After `bun install`, Husky's `prepare` script runs automatically and sets up the `.husky/` directory.
No manual `husky install` needed — Bun respects the `prepare` lifecycle hook.
