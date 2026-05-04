import type { Expense, Category } from "../types";
import ExpenseListItem from "./ExpenseListItem";
import styles from "./ExpenseList.module.css";

interface ExpenseListProps {
  loading: boolean;
  error: string | null;
  expenses: Expense[];
  activeFilter: Category | null;
  onRetry: () => void;
}

export default function ExpenseList({
  loading,
  error,
  expenses,
  activeFilter,
  onRetry,
}: ExpenseListProps) {
  if (loading) {
    return (
      <div className={styles.list}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.skeleton}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLineShort} />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          Failed to load expenses. Pull to retry.
          <button type="button" className={styles.retryBtn} onClick={onRetry}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className={styles.list}>
        <div className={styles.empty}>
          {activeFilter
            ? "No expenses match this filter"
            : "Submit your first expense!"}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {expenses.map((expense) => (
        <ExpenseListItem key={expense.id} expense={expense} />
      ))}
    </div>
  );
}
