import { useState, useEffect, useCallback } from "react";
import type { Category, Expense, ExpenseListResponse } from "./types";
import Header from "./components/Header";
import ExpenseForm from "./components/ExpenseForm";
import ExpenseSummary from "./components/ExpenseSummary";
import ExpenseFilter from "./components/ExpenseFilter";
import ExpenseList from "./components/ExpenseList";
import { fetchExpenses } from "./api/expenses";

export default function App() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [subtotals, setSubtotals] = useState<
    ExpenseListResponse["subtotals"]
  >({
    food: 0,
    transport: 0,
    accommodation: 0,
    other: 0,
  });
  const [activeFilter, setActiveFilter] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { category?: string } = {};
      if (activeFilter) params.category = activeFilter;
      const data: ExpenseListResponse = await fetchExpenses(params);
      setExpenses(data.expenses);
      setTotal(data.total);
      setSubtotals(data.subtotals);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e?.message ?? "Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  function handleFilterChange(category: Category | null) {
    setActiveFilter(category);
  }

  function handleExpenseCreated() {
    loadExpenses();
  }

  return (
    <div>
      <Header />
      <ExpenseForm onExpenseCreated={handleExpenseCreated} />
      <ExpenseSummary
        loading={loading}
        total={total}
        subtotals={subtotals}
        activeFilter={activeFilter}
      />
      <ExpenseFilter
        activeFilter={activeFilter}
        onFilterChange={handleFilterChange}
      />
      <ExpenseList
        loading={loading}
        error={error}
        expenses={expenses}
        activeFilter={activeFilter}
        onRetry={loadExpenses}
      />
    </div>
  );
}
