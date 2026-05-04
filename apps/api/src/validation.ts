export type ValidationDetail = { field: string; message: string };

export type ValidationResult = {
  valid: boolean;
  errors?: ValidationDetail[];
};

const VALID_CATEGORIES = ["food", "transport", "accommodation", "other"] as const;

export function validateCreateExpense(body: Record<string, unknown>): ValidationResult {
  const errors: ValidationDetail[] = [];

  // amount
  if (body.amount === undefined || body.amount === null) {
    errors.push({ field: "amount", message: "Amount is required" });
  } else if (typeof body.amount !== "number" || isNaN(body.amount as number)) {
    errors.push({ field: "amount", message: "Amount must be a number" });
  } else {
    const amt = body.amount as number;
    if (amt <= 0) {
      errors.push({ field: "amount", message: "Amount must be greater than 0" });
    }
    if (amt > 999999999.0) {
      errors.push({
        field: "amount",
        message: "Amount must not exceed 999999999.00",
      });
    }
    // Check at most 2 decimal places
    if (parseFloat(amt.toFixed(2)) !== amt) {
      errors.push({
        field: "amount",
        message: "Amount must have at most 2 decimal places",
      });
    }
  }

  // category
  if (!body.category || typeof body.category !== "string") {
    errors.push({ field: "category", message: "Category is required" });
  } else if (!VALID_CATEGORIES.includes(body.category as (typeof VALID_CATEGORIES)[number])) {
    errors.push({
      field: "category",
      message: "Category must be one of: food, transport, accommodation, other",
    });
  }

  // description
  if (body.description === undefined || body.description === null) {
    errors.push({ field: "description", message: "Description is required" });
  } else if (typeof body.description !== "string") {
    errors.push({ field: "description", message: "Description must be a string" });
  } else {
    const desc = body.description as string;
    if (desc.trim().length === 0) {
      errors.push({ field: "description", message: "Description must not be empty" });
    }
    if (desc.length > 500) {
      errors.push({
        field: "description",
        message: "Description must not exceed 500 characters",
      });
    }
  }

  // date
  if (!body.date || typeof body.date !== "string") {
    errors.push({
      field: "date",
      message: "Date is required and must be a valid ISO 8601 datetime string",
    });
  } else {
    const d = new Date(body.date as string);
    if (isNaN(d.getTime())) {
      errors.push({
        field: "date",
        message: "Date must be a valid ISO 8601 datetime string",
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  };
}
