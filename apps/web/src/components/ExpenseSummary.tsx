import type { Category } from "../types";
import { CATEGORIES, CATEGORY_LABELS, formatAmount } from "../types";
import styles from "./ExpenseSummary.module.css";

interface ExpenseSummaryProps {
  loading: boolean;
  total: number;
  subtotals: {
    food: number;
    transport: number;
    accommodation: number;
    other: number;
  };
  activeFilter: Category | null;
}

export default function ExpenseSummary({
  loading,
  total,
  subtotals,
  activeFilter,
}: ExpenseSummaryProps) {
  if (loading) {
    return (
      <div className={styles.skeleton}>
        <div className={styles.skeletonLine} />
        <div className={styles.skeletonLineShort} />
      </div>
    );
  }

  const hasExpenses = total > 0;

  if (!hasExpenses) {
    return (
      <div className={styles.summary}>
        <div className={styles.total}>฿0.00</div>
        <div className={styles.empty}>No expenses yet</div>
      </div>
    );
  }

  const shownCategories: Category[] = activeFilter
    ? [activeFilter]
    : CATEGORIES;

  return (
    <div className={styles.summary}>
      <div className={styles.total}>{formatAmount(total)}</div>
      <div className={styles.subtotals}>
        {shownCategories.map((cat) => (
          <span
            key={cat}
            className={`${styles.subtotal} ${activeFilter === cat ? styles.activeCat : ""}`}
          >
            {CATEGORY_LABELS[cat]}: {formatAmount(subtotals[cat])}
          </span>
        ))}
      </div>
    </div>
  );
}
