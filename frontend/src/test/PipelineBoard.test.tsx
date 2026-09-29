import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PipelineBoard } from "../components/PipelineBoard";
import type { Lead } from "../types";

function makeLead(id: string, stage: Lead["stage"], value: string): Lead {
  return {
    id,
    company_id: "c1",
    contact_id: "ct1",
    title: `Lead ${id}`,
    description: null,
    value,
    currency: "USD",
    stage,
    priority: "medium",
    source: "referral",
    expected_close_date: null,
    owner_id: "u1",
    archived: false,
    archived_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    company: { id: "c1", name: "Acme Corp", industry: "Software" },
    contact: {
      id: "ct1",
      first_name: "Jane",
      last_name: "Doe",
      full_name: "Jane Doe",
      email: "jane@acme.example.com",
      company_id: "c1",
      job_title: null,
    },
    owner: { id: "u1", full_name: "Alex Admin", email: "a@b.example.com" },
  };
}

const leads = [makeLead("l1", "new", "10000.00"), makeLead("l2", "proposal", "25000.00")];

function renderBoard(onMoveLead = vi.fn()) {
  render(
    <MemoryRouter>
      <PipelineBoard leads={leads} onMoveLead={onMoveLead} />
    </MemoryRouter>,
  );
  return onMoveLead;
}

describe("PipelineBoard", () => {
  it("renders all six stage columns with counts and totals", () => {
    renderBoard();
    expect(screen.getByTestId("pipeline-column-new")).toBeInTheDocument();
    expect(screen.getByTestId("pipeline-column-won")).toBeInTheDocument();
    expect(screen.getByTestId("pipeline-value-new")).toHaveTextContent("$10,000");
    expect(screen.getByTestId("pipeline-value-proposal")).toHaveTextContent("$25,000");
    expect(screen.getByTestId("pipeline-card-l1")).toBeInTheDocument();
  });

  it("drops a card onto a column and calls onMoveLead", () => {
    const onMoveLead = renderBoard();

    const card = screen.getByTestId("pipeline-card-l1");
    const wonColumn = screen.getByTestId("pipeline-column-won");

    // Simulate the HTML5 drag-and-drop data transfer.
    const dataTransfer = {
      data: {} as Record<string, string>,
      setData(key: string, value: string) {
        this.data[key] = value;
      },
      getData(key: string) {
        return this.data[key];
      },
    };
    fireEvent.dragStart(card, { dataTransfer });
    expect(dataTransfer.getData("text/plain")).toBe("l1");
    fireEvent.drop(wonColumn, { dataTransfer });

    expect(onMoveLead).toHaveBeenCalledWith("l1", "won");
  });
});
