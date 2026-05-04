import { t, type Static } from "elysia";

// ─── Schema catalog ────────────────────────────────────────────────

export const CategoryEnum = t.Union([
  t.Literal("food"),
  t.Literal("transport"),
  t.Literal("accommodation"),
  t.Literal("other"),
]);

export const CreateExpenseBody = t.Object({
  amount: t.Number({
    minimum: 0,
    exclusiveMinimum: true,
    maximum: 999999999,
    multipleOf: 0.01,
  }),
  category: CategoryEnum,
  description: t.String({ minLength: 1, maxLength: 500 }),
  date: t.String({ format: "date-time" }),
});

export const ListExpensesQuery = t.Object({
  category: t.Optional(CategoryEnum),
  sort_by: t.Optional(t.Union([t.Literal("date"), t.Literal("amount")])),
  sort_order: t.Optional(t.Union([t.Literal("asc"), t.Literal("desc")])),
});

export const ExpenseSchema = t.Object({
  id: t.Number(),
  amount: t.Number(),
  category: CategoryEnum,
  description: t.String(),
  date: t.String(),
  created_at: t.String(),
});

export const ExpenseListResponse = t.Object({
  expenses: t.Array(ExpenseSchema),
  total: t.Number(),
  subtotals: t.Object({
    food: t.Number(),
    transport: t.Number(),
    accommodation: t.Number(),
    other: t.Number(),
  }),
});

export const ApiError = t.Object({
  error: t.String(),
  message: t.String(),
});

// ─── Inferred TypeScript types ─────────────────────────────────────

export type CategoryEnumType = Static<typeof CategoryEnum>;
export type CreateExpenseBodyType = Static<typeof CreateExpenseBody>;
export type ListExpensesQueryType = Static<typeof ListExpensesQuery>;
export type ExpenseRowType = Static<typeof ExpenseSchema>;
export type ExpenseListResponseType = Static<typeof ExpenseListResponse>;
export type ApiErrorType = Static<typeof ApiError>;
