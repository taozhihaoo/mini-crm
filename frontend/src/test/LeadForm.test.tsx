import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadForm } from "../components/forms/LeadForm";
import type { Company, Contact } from "../types";

const company: Company = {
  id: "c1",
  name: "Acme Corp",
  website: null,
  industry: "Software",
  phone: null,
  email: null,
  address: null,
  notes: null,
  archived: false,
  archived_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const contact: Contact = {
  id: "ct1",
  company_id: "c1",
  first_name: "Jane",
  last_name: "Doe",
  full_name: "Jane Doe",
  email: "jane@acme.example.com",
  phone: null,
  job_title: null,
  notes: null,
  archived: false,
  archived_at: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  company: { id: "c1", name: "Acme Corp", industry: "Software" },
};

describe("LeadForm", () => {
  it("requires company, contact and title", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <LeadForm companies={[company]} contacts={[contact]} onSubmit={onSubmit} onCancel={() => {}} />,
    );

    await user.click(screen.getByText("Save"));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByText("Company is required")).toBeInTheDocument();
  });

  it("submits a complete lead payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <LeadForm companies={[company]} contacts={[contact]} onSubmit={onSubmit} onCancel={() => {}} />,
    );

    await user.selectOptions(screen.getByTestId("lead-company"), "c1");
    await user.type(screen.getByTestId("lead-title"), "Website redesign");
    // Contact select only shows contacts of the chosen company.
    await user.selectOptions(screen.getByTestId("lead-contact"), "ct1");
    await user.click(screen.getByText("Save"));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.company_id).toBe("c1");
    expect(payload.contact_id).toBe("ct1");
    expect(payload.title).toBe("Website redesign");
    expect(payload.currency).toBe("USD");
  });
});
