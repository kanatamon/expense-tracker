import { useState, type FormEvent } from "react";
import type { Category, CreateExpensePayload } from "../types";
import { CATEGORIES, CATEGORY_LABELS } from "../types";
import { createExpense } from "../api/expenses";
import styles from "./ExpenseForm.module.css";

interface ExpenseFormProps {
  onExpenseCreated: () => void;
}

interface FieldErrors {
  amount?: string;
  category?: string;
  description?: string;
  date?: string;
}

function nowLocalDatetime(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function ExpenseForm({ onExpenseCreated }: ExpenseFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(nowLocalDatetime());
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt < 0.01) {
      errors.amount = "Amount must be at least 0.01";
    }
    if (amt > 999999999) {
      errors.amount = "Amount must not exceed 999,999,999";
    }
    if (!description.trim()) {
      errors.description = "Description is required";
    }
    if (description.length > 500) {
      errors.description = "Description must be 500 characters or less";
    }
    if (!date) {
      errors.date = "Date is required";
    }
    return errors;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setToast(null);

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      const payload: CreateExpensePayload = {
        amount: parseFloat(amount),
        category,
        description: description.trim(),
        date: new Date(date).toISOString(),
      };
      await createExpense(payload);
      setAmount("");
      setCategory("food");
      setDescription("");
      setDate(nowLocalDatetime());
      setFieldErrors({});
      setToast({ type: "success", message: "Expense added!" });
      onExpenseCreated();
    } catch (err: unknown) {
      const apiErr = err as { error?: string; message?: string; details?: Array<{ field: string; message: string }> };
      if (apiErr?.details && Array.isArray(apiErr.details)) {
        const fieldErrs: FieldErrors = {};
        for (const d of apiErr.details) {
          if (d.field === "amount") fieldErrs.amount = d.message;
          if (d.field === "category") fieldErrs.category = d.message;
          if (d.field === "description") fieldErrs.description = d.message;
          if (d.field === "date") fieldErrs.date = d.message;
        }
        setFieldErrors(fieldErrs);
      }
      setToast({
        type: "error",
        message: apiErr?.message ?? "Something went wrong. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        className={styles.toggleBtn}
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? "− Hide Form" : "+ New Expense"}
      </button>
      {expanded && (
        <form className={styles.form} onSubmit={handleSubmit}>
          {toast && (
            <div
              className={
                toast.type === "success" ? styles.successToast : styles.errorToast
              }
            >
              {toast.message}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="amount">
              Amount
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max="999999999"
              className={`${styles.input} ${fieldErrors.amount ? styles.inputError : ""}`}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setFieldErrors((prev) => ({ ...prev, amount: undefined }));
              }}
              placeholder="0.00"
            />
            {fieldErrors.amount && (
              <div className={styles.fieldError}>{fieldErrors.amount}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="category">
              Category
            </label>
            <select
              id="category"
              className={`${styles.select} ${fieldErrors.category ? styles.inputError : ""}`}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as Category);
                setFieldErrors((prev) => ({ ...prev, category: undefined }));
              }}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
            {fieldErrors.category && (
              <div className={styles.fieldError}>{fieldErrors.category}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="description">
              Description
            </label>
            <textarea
              id="description"
              className={`${styles.textarea} ${fieldErrors.description ? styles.inputError : ""}`}
              maxLength={500}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((prev) => ({ ...prev, description: undefined }));
              }}
              placeholder="What was this expense for?"
            />
            {fieldErrors.description && (
              <div className={styles.fieldError}>{fieldErrors.description}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="date">
              Date / Time
            </label>
            <input
              id="date"
              type="datetime-local"
              className={`${styles.input} ${fieldErrors.date ? styles.inputError : ""}`}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, date: undefined }));
              }}
            />
            {fieldErrors.date && (
              <div className={styles.fieldError}>{fieldErrors.date}</div>
            )}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      )}
    </div>
  );
}
