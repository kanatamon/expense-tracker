import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import * as api from "./api/expenses";

vi.mock("./api/expenses");

const mockExpenses = [
  {
    id: 1,
    amount: 450.6,
    category: "food" as const,
    description: "Team lunch",
    date: "2026-05-04T12:30:00.000Z",
    created_at: "2026-05-04T10:00:00.000Z",
  },
  {
    id: 2,
    amount: 250.0,
    category: "transport" as const,
    description: "Airport pickup",
    date: "2026-05-03T08:00:00.000Z",
    created_at: "2026-05-03T06:00:00.000Z",
  },
];

const mockResponse = {
  expenses: mockExpenses,
  total: 700.6,
  subtotals: {
    food: 450.6,
    transport: 250.0,
    accommodation: 0,
    other: 0,
  },
};

const emptyResponse = {
  expenses: [],
  total: 0,
  subtotals: {
    food: 0,
    transport: 0,
    accommodation: 0,
    other: 0,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.fetchExpenses).mockResolvedValue(mockResponse);
});

describe("App", () => {
  it("renders the header", async () => {
    render(<App />);
    expect(screen.getByText("Expenses")).toBeInTheDocument();
  });

  it("shows empty state when there are no expenses", async () => {
    vi.mocked(api.fetchExpenses).mockResolvedValue(emptyResponse);
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Submit your first expense!")).toBeInTheDocument();
    });
  });

  it("shows loading state during API call", async () => {
    vi.mocked(api.fetchExpenses).mockImplementation(
      () => new Promise(() => {}), // never resolves
    );
    render(<App />);
    expect(screen.getByText("Expenses")).toBeInTheDocument();
    // Loading skeletons should appear
    const summary = document.querySelector('[class*="skeleton"]');
    expect(summary).toBeTruthy();
  });

  it("has a form submit button that works when form is expanded and filled", async () => {
    render(<App />);
    const toggle = screen.getByText("+ New Expense");
    await userEvent.click(toggle);

    const amountInput = screen.getByLabelText("Amount");
    const descInput = screen.getByLabelText("Description");
    const submitBtn = screen.getByRole("button", { name: /submit/i });

    // Submit button exists and is visible
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toHaveTextContent("Submit");

    await userEvent.type(amountInput, "100");
    await userEvent.type(descInput, "Test expense");

    expect(submitBtn).toBeEnabled();
  });

  it("has an Export CSV button", async () => {
    render(<App />);
    const exportBtn = screen.getByText("Export CSV");
    expect(exportBtn).toBeInTheDocument();
  });

  it("renders expense items when data is loaded", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("Team lunch")).toBeInTheDocument();
      expect(screen.getByText("Airport pickup")).toBeInTheDocument();
    });
  });

  it("shows total amount when data is loaded", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText("฿700.60")).toBeInTheDocument();
    });
  });

  it("shows error state with retry button on API failure", async () => {
    vi.mocked(api.fetchExpenses).mockRejectedValue(
      new Error("Network error"),
    );
    render(<App />);
    await waitFor(() => {
      expect(
        screen.getByText(/Failed to load expenses/i),
      ).toBeInTheDocument();
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });
  });
});
