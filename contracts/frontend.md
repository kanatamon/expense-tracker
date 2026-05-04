# Frontend Contract

**Framework:** React 18+ with TypeScript, Vite
**Port:** 5173
**Target:** Mobile-only (design for viewport <= 480px wide)

---

## TypeScript types (shared)

These must exactly match the API response shapes from `api.md`.

```typescript
interface Expense {
  id: number;
  amount: number;
  category: 'food' | 'transport' | 'accommodation' | 'other';
  description: string;
  date: string;        // ISO 8601
  created_at: string;  // ISO 8601
}

interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  subtotals: {
    food: number;
    transport: number;
    accommodation: number;
    other: number;
  };
}

interface CreateExpensePayload {
  amount: number;
  category: 'food' | 'transport' | 'accommodation' | 'other';
  description: string;
  date: string;        // ISO 8601
}

type Category = 'food' | 'transport' | 'accommodation' | 'other';
```

---

## API client

A single module `src/api/expenses.ts` that wraps all backend calls.

| Function              | Method | Endpoint                 | Returns                  |
|-----------------------|--------|--------------------------|--------------------------|
| `fetchExpenses(params)` | GET    | `/api/expenses`          | `ExpenseListResponse`    |
| `createExpense(payload)`| POST   | `/api/expenses`          | `Expense`                |
| `exportCSV(params)`     | GET    | `/api/expenses/csv`      | triggers browser download |

- `exportCSV` should use `window.open(url)` or create a temporary `<a>` element to download the CSV.

---

## Page layout (mobile-first, single page)

```
┌──────────────────────────┐
│  Header: "Expenses"       │
├──────────────────────────┤
│  [ExpenseForm]            │  ← collapsible section
│    Amount     [ input  ]  │
│    Category   [ select ]  │
│    Description [ textarea]│
│    Date/Time  [ picker  ]│
│    [Submit]               │
├──────────────────────────┤
│  [ExpenseSummary]         │
│    Total: ฿4,500.00       │
│    Food: ฿1,500.00        │  ← shown when filter = 'food' or 'all'
│    Transport: ฿1,000.00   │     (only active filter's subtotal shown)
│    ...                    │
├──────────────────────────┤
│  [ExpenseFilter]          │
│    [All] [Food] [Transport] [Accommodation] [Other]
│    [Export CSV]           │
├──────────────────────────┤
│  [ExpenseList]            │
│    ┌──────────────────┐   │
│    │ May 4, 2026       │   │
│    │ 🍔 Food · ฿450.60 │   │
│    │ Team lunch        │   │
│    ├──────────────────┤   │
│    │ May 3, 2026       │   │
│    │ 🚕 Transport ·    │   │
│    │ ฿250.00           │   │
│    │ Airport pickup    │   │
│    └──────────────────┘   │
└──────────────────────────┘
```

---

## Component tree

```
App
├── Header
├── ExpenseForm          (collapsible; expand/collapse toggle)
├── ExpenseSummary       (total + active category subtotal)
├── ExpenseFilter        (category chips + export button)
└── ExpenseList
    └── ExpenseListItem  (repeated per expense)
```

---

## Component specifications

### `Header`
- Displays page title "Expenses"
- Stick to top of viewport

### `ExpenseForm`
- **Fields:**
  - `amount` — number input with step="0.01", min="0.01", max="999999999"
  - `category` — select with 4 options
  - `description` — textarea with maxLength=500
  - `date` — datetime-local input, default value = current datetime (client-side `new Date()`)
- **States:**
  - **Default:** empty form, date pre-filled with now
  - **Loading:** submit button disabled, shows spinner/text "Submitting..."
  - **Error:** inline error messages per field, plus a top-level toast/alert on API failure
  - **Success:** form resets (date resets to now), show brief success feedback (toast or inline message)
- Collapsible via a toggle button ("+ New Expense" / "− Hide Form")

### `ExpenseSummary`
- Displays `total` from the API response formatted as `฿X,XXX.XX`
- Displays the subtotal for the **currently selected category** (if a filter is active), or **all 4 subtotals** (if no filter is active)
- **States:**
  - **Loading:** skeleton / pulsing placeholder while API call is in flight
  - **Empty:** "No expenses yet" message
  - **Populated:** formatted totals

### `ExpenseFilter`
- Row of category chips/buttons: `All | Food | Transport | Accommodation | Other`
- Tapping a chip sets the active filter and refetches the list
- "All" = no filter
- Active chip is visually distinct (e.g., filled/highlighted)
- **Export CSV** button at the end of the filter row — triggers `exportCSV()` with current filter params

### `ExpenseList`
- Renders list of `ExpenseListItem` components
- **States:**
  - **Loading:** skeleton cards (3-4 placeholder items)
  - **Empty:** "No expenses match this filter" (or "Submit your first expense!" if no filter)
  - **Error:** "Failed to load expenses. Pull to retry." with a retry button
  - **Populated:** list of expense cards

### `ExpenseListItem`
- Displays:
  - Date formatted as readable string (e.g., "May 4, 2026, 12:30 PM")
  - Category as a colored badge/pill
  - Amount formatted as `฿X,XXX.XX` right-aligned
  - Description as secondary text
- No interaction (tappable detail view is not in v1 scope)

---

## Error handling strategy

| Scenario                    | UX                                                           |
|-----------------------------|--------------------------------------------------------------|
| Network error (no internet) | Toast: "Cannot reach server. Check your connection."         |
| API 400 (validation)        | Field-level error messages + summary toast                   |
| API 500                     | Toast: "Something went wrong. Please try again."             |
| Empty list                  | Empty state illustration + helper text                       |
| Loading                     | Skeleton placeholders or spinner per component               |

---

## Styling

- CSS Modules or a lightweight CSS-in-JS approach (avoid heavy libraries)
- Design for viewport max-width 480px, min-width 320px
- Color scheme:
  - Background: `#f5f5f5`
  - Card background: `#ffffff`
  - Primary: `#1a73e8`
  - Danger/error: `#d93025`
  - Category badges: distinct pastels
- Font: system font stack
- Touch targets: minimum 44x44px
