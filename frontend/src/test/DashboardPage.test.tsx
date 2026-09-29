import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { StatCard } from "../components/StatCard";
import { AuthProvider } from "../context/AuthContext";

vi.mock("../api/dashboard", () => ({
  getDashboard: vi.fn().mockResolvedValue({
    total_companies: 10,
    total_contacts: 20,
    open_leads: 11,
    won_leads: 2,
    lost_leads: 2,
    pipeline_value: "311000.00",
    tasks_due_today: 3,
    tasks_overdue: 2,
    pipeline: [
      { stage: "new", count: 4, value: "74000.00" },
      { stage: "qualified", count: 3, value: "102000.00" },
      { stage: "proposal", count: 2, value: "87500.00" },
      { stage: "negotiation", count: 2, value: "76000.00" },
      { stage: "won", count: 2, value: "59000.00" },
      { stage: "lost", count: 2, value: "37500.00" },
    ],
    recent_activities: [],
    due_today_tasks: [],
    overdue_tasks: [],
    upcoming_tasks: [],
  }),
}));

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  localStorage.setItem("cf_token", "t");
  localStorage.setItem(
    "cf_user",
    JSON.stringify({
      id: "u1",
      email: "a@b.example.com",
      full_name: "Alex",
      role: "admin",
      is_active: true,
    }),
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <DashboardPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("DashboardPage", () => {
  it("renders live stat values from the API", async () => {
    renderDashboard();
    expect(await screen.findByText("Pipeline Value")).toBeInTheDocument();
    const values = screen.getAllByTestId("stat-value").map((el) => el.textContent);
    expect(values).toContain("10"); // companies
    expect(values).toContain("11"); // open leads
    expect(values).toContain("$311,000"); // pipeline value
    expect(screen.getByText("Sales Pipeline")).toBeInTheDocument();
  });
});

describe("shared states and stat cards", () => {
  it("renders loading, error and empty states", () => {
    render(<LoadingState label="Fetching…" />);
    expect(screen.getByText("Fetching…")).toBeInTheDocument();

    render(<ErrorState message="Boom" onRetry={() => {}} />);
    expect(screen.getByText("Boom")).toBeInTheDocument();

    render(<EmptyState title="No data" hint="Try again later" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders a stat card with tone", () => {
    render(<StatCard label="Overdue Tasks" value={4} tone="danger" hint="needs attention" />);
    expect(screen.getByText("Overdue Tasks")).toBeInTheDocument();
    expect(screen.getByTestId("stat-value")).toHaveTextContent("4");
  });
});
