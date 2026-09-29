import { useForm } from "react-hook-form";
import type { Company } from "../../types";
import { Field, Input, Textarea } from "../ui";
import type { CompanyPayload } from "../../api/companies";

export function CompanyForm({
  initial,
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Save",
}: {
  initial?: Company;
  onSubmit: (payload: CompanyPayload) => void;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { register, handleSubmit, formState } = useForm<CompanyPayload>({
    defaultValues: {
      name: initial?.name ?? "",
      website: initial?.website ?? "",
      industry: initial?.industry ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4" noValidate>
      <Field label="Name" required error={formState.errors.name?.message}>
        <Input
          {...register("name", { required: "Name is required", maxLength: 255 })}
          data-testid="company-name"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Website">
          <Input {...register("website")} placeholder="https://" />
        </Field>
        <Field label="Industry">
          <Input {...register("industry")} />
        </Field>
        <Field label="Phone">
          <Input {...register("phone")} />
        </Field>
        <Field label="Email" error={formState.errors.email?.message}>
          <Input {...register("email")} type="email" />
        </Field>
      </div>
      <Field label="Address">
        <Input {...register("address")} />
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
