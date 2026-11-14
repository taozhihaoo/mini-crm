import { useForm } from "react-hook-form";
import type { Company, Contact } from "../../types";
import { Button, Field, Input, Select, Textarea } from "../ui";
import type { ContactPayload } from "../../api/contacts";
import { emptyToNull } from "../../lib/emptyToNull";
import { useI18n } from "../../i18n";

export function ContactForm({
  companies,
  initial,
  defaultCompanyId,
  onSubmit,
  onCancel,
  busy,
  submitLabel,
}: {
  companies: Company[];
  initial?: Contact;
  defaultCompanyId?: string;
  onSubmit: (payload: ContactPayload) => void;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { t } = useI18n();
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
      <Field label={t("Company")} required error={formState.errors.company_id?.message}>
        <Select {...register("company_id", { required: t("Company is required") })} data-testid="contact-company">
          <option value="">{t("Select a company…")}</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("First name")} required error={formState.errors.first_name?.message}>
          <Input {...register("first_name", { required: t("First name is required") })} />
        </Field>
        <Field label={t("Last name")} required error={formState.errors.last_name?.message}>
          <Input {...register("last_name", { required: t("Last name is required") })} />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Email")} required error={formState.errors.email?.message}>
          <Input
            {...register("email", {
              required: t("Email is required"),
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t("Enter a valid email") },
            })}
            type="email"
          />
        </Field>
        <Field label={t("Phone")}>
          <Input {...register("phone")} />
        </Field>
      </div>
      <Field label={t("Job title")}>
        <Input {...register("job_title")} />
      </Field>
      <Field label={t("Notes")}>
        <Textarea {...register("notes")} rows={3} />
      </Field>
      <div className="flex justify-end gap-2 border-t cf-divider pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? t("Saving…") : (submitLabel ?? t("Save"))}
        </Button>
      </div>
    </form>
  );
}
