import { useForm } from "react-hook-form";
import type { Company, Contact } from "../../types";
import { Field, Input, Select, Textarea } from "../ui";
import type { ContactPayload } from "../../api/contacts";
import { emptyToNull } from "../../lib/emptyToNull";

export function ContactForm({
  companies,
  initial,
  defaultCompanyId,
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Save",
}: {
  companies: Company[];
  initial?: Contact;
  defaultCompanyId?: string;
  onSubmit: (payload: ContactPayload) => void;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { register, handleSubmit, formState } = useForm<ContactPayload>({
    defaultValues: {
      company_id: initial?.company_id ?? defaultCompanyId ?? "",
      first_name: initial?.first_name ?? "",
      last_name: initial?.last_name ?? "",
      email: initial?.email ?? "",
      phone: initial?.phone ?? "",
      job_title: initial?.job_title ?? "",
      notes: initial?.notes ?? "",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => onSubmit(emptyToNull(values)))}
      className="space-y-4"
      noValidate
    >
      <Field label="Company" required error={formState.errors.company_id?.message}>
        <Select {...register("company_id", { required: "Company is required" })} data-testid="contact-company">
          <option value="">Select a company…</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" required error={formState.errors.first_name?.message}>
          <Input {...register("first_name", { required: "First name is required" })} />
        </Field>
        <Field label="Last name" required error={formState.errors.last_name?.message}>
          <Input {...register("last_name", { required: "Last name is required" })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" required error={formState.errors.email?.message}>
          <Input
            {...register("email", {
              required: "Email is required",
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Enter a valid email" },
            })}
            type="email"
          />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
      </div>
      <Field label="Job title">
        <Input {...register("job_title")} />
      </Field>
      <Field label="Notes">
        <Textarea {...register("notes")} rows={3} />
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
