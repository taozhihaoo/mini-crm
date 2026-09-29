import { useForm } from "react-hook-form";
import type { Company, Contact, ContactBrief, Lead, LeadPriority, LeadSource, LeadStage, User } from "../../types";
import { LEAD_SOURCES, PRIORITIES } from "../../types";
import { Field, Input, Select, Textarea } from "../ui";
import type { LeadPayload } from "../../api/leads";

interface LeadFormValues {
  company_id: string;
  contact_id: string;
  title: string;
  description: string;
  value: string;
  currency: string;
  stage: LeadStage;
  priority: LeadPriority;
  source: LeadSource;
  expected_close_date: string;
  owner_id: string;
}

export function LeadForm({
  companies,
  contacts,
  users,
  initial,
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Save",
}: {
  companies: Company[];
  contacts: ContactBrief[] | Contact[];
  users?: User[];
  initial?: Lead;
  onSubmit: (payload: LeadPayload) => void;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { register, handleSubmit, watch, formState } = useForm<LeadFormValues>({
    defaultValues: {
      company_id: initial?.company_id ?? "",
      contact_id: initial?.contact_id ?? "",
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      value: initial?.value ?? "0",
      currency: initial?.currency ?? "USD",
      stage: initial?.stage ?? "new",
      priority: initial?.priority ?? "medium",
      source: initial?.source ?? "other",
      expected_close_date: initial?.expected_close_date ?? "",
      owner_id: initial?.owner_id ?? "",
    },
  });

  const selectedCompanyId = watch("company_id");
  const companyContacts = contacts.filter((contact) => contact.company_id === selectedCompanyId);

  return (
    <form
      onSubmit={handleSubmit((values) =>
        onSubmit({
          ...values,
          description: values.description || null,
          expected_close_date: values.expected_close_date || null,
          owner_id: values.owner_id || undefined,
        }),
      )}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" required error={formState.errors.company_id?.message}>
          <Select {...register("company_id", { required: "Company is required" })} data-testid="lead-company">
            <option value="">Select a company…</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Contact" required error={formState.errors.contact_id?.message}>
          <Select {...register("contact_id", { required: "Contact is required" })} data-testid="lead-contact">
            <option value="">Select a contact…</option>
            {companyContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name || `${contact.first_name} ${contact.last_name}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Title" required error={formState.errors.title?.message}>
        <Input {...register("title", { required: "Title is required", maxLength: 200 })} data-testid="lead-title" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Value" error={formState.errors.value?.message}>
          <Input
            {...register("value", {
              validate: (v) => v === "" || Number(v) >= 0 || "Value must be a positive number",
            })}
            type="number"
            min="0"
            step="0.01"
          />
        </Field>
        <Field label="Currency">
          <Select {...register("currency")}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
        </Field>
        <Field label="Source">
          <Select {...register("source")}>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {source.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Stage">
          <Select {...register("stage")}>
            <option value="new">New</option>
            <option value="qualified">Qualified</option>
            <option value="proposal">Proposal</option>
            <option value="negotiation">Negotiation</option>
          </Select>
        </Field>
        <Field label="Priority">
          <Select {...register("priority")}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Expected close">
          <Input {...register("expected_close_date")} type="date" />
        </Field>
      </div>
      {users && users.length > 0 && (
        <Field label="Owner">
          <Select {...register("owner_id")}>
            <option value="">Me (current user)</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label="Description">
        <Textarea {...register("description")} rows={3} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
