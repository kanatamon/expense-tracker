import type { Category } from "../types";
import { CATEGORIES, CATEGORY_LABELS } from "../types";
import { exportCSV } from "../api/expenses";
import styles from "./ExpenseFilter.module.css";

interface ExpenseFilterProps {
  activeFilter: Category | null;
  onFilterChange: (category: Category | null) => void;
}

export default function ExpenseFilter({
  activeFilter,
  onFilterChange,
}: ExpenseFilterProps) {
  return (
    <div className={styles.filterRow}>
      <button
        type="button"
        className={`${styles.chip} ${activeFilter === null ? styles.chipActive : ""}`}
        onClick={() => onFilterChange(null)}
      >
        All
      </button>
      {CATEGORIES.map((cat) => (
        <button
          key={cat}
          type="button"
          className={`${styles.chip} ${activeFilter === cat ? styles.chipActive : ""}`}
          onClick={() => onFilterChange(cat)}
        >
          {CATEGORY_LABELS[cat]}
        </button>
      ))}
      <button
        type="button"
        className={styles.exportBtn}
        onClick={() =>
          exportCSV(activeFilter ? { category: activeFilter } : undefined)
        }
      >
        Export CSV
      </button>
    </div>
  );
}
