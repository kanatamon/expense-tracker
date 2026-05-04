import type { Expense, Category } from "../types";
import { CATEGORY_LABELS, CATEGORY_COLORS, formatDate, formatAmount } from "../types";
import styles from "./ExpenseListItem.module.css";

interface ExpenseListItemProps {
  expense: Expense;
}

export default function ExpenseListItem({ expense }: ExpenseListItemProps) {
  const badgeColor = CATEGORY_COLORS[expense.category as Category] || "#e0e0e0";

  return (
    <div className={styles.card}>
      <div className={styles.topRow}>
        <span className={styles.date}>{formatDate(expense.date)}</span>
        <span className={styles.amount}>{formatAmount(expense.amount)}</span>
      </div>
      <div className={styles.bottomRow}>
        <span className={styles.description}>{expense.description}</span>
        <span
          className={styles.badge}
          style={{ background: badgeColor }}
        >
          {CATEGORY_LABELS[expense.category as Category] || expense.category}
        </span>
      </div>
    </div>
  );
}
