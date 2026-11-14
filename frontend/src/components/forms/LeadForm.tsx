import { useForm } from "react-hook-form";
import type { Company, Contact, ContactBrief, Lead, LeadPriority, LeadSource, LeadStage, User } from "../../types";
import { LEAD_SOURCES, PRIORITIES, STAGE_LABELS } from "../../types";
import { Button, Field, Input, Select, Textarea } from "../ui";
import type { LeadPayload } from "../../api/leads";
import { useI18n } from "../../i18n";

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
  submitLabel,
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
  const { t } = useI18n();
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
          value: values.value === "" ? "0" : values.value,
          expected_close_date: values.expected_close_date || null,
          owner_id: values.owner_id || undefined,
        }),
      )}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Company")} required error={formState.errors.company_id?.message}>
          <Select {...register("company_id", { required: t("Company is required") })} data-testid="lead-company">
            <option value="">{t("Select a company…")}</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Contact")} required error={formState.errors.contact_id?.message}>
          <Select {...register("contact_id", { required: t("Contact is required") })} data-testid="lead-contact">
            <option value="">{t("Select a contact…")}</option>
            {companyContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name || `${contact.first_name} ${contact.last_name}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={t("Title")} required error={formState.errors.title?.message}>
        <Input {...register("title", { required: t("Title is required"), maxLength: 200 })} data-testid="lead-title" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("Value")} error={formState.errors.value?.message}>
          <Input
            {...register("value", {
              validate: (v) => v === "" || Number(v) >= 0 || t("Value must be a positive number"),
            })}
            type="number"
            min="0"
            step="0.01"
          />
        </Field>
        <Field label={t("Currency")}>
          <Select {...register("currency")}>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </Select>
        </Field>
        <Field label={t("Source")}>
          <Select {...register("source")}>
            {LEAD_SOURCES.map((source) => (
              <option key={source} value={source}>
                {t(source)}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("Stage")}>
          <Select {...register("stage")}>
            {(["new", "qualified", "proposal", "negotiation"] as LeadStage[]).map((stage) => (
              <option key={stage} value={stage}>
                {t(STAGE_LABELS[stage])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Priority")}>
          <Select {...register("priority")}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {t(priority)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Expected close")}>
          <Input {...register("expected_close_date")} type="date" />
        </Field>
      </div>
      {users && users.length > 0 && (
        <Field label={t("Owner")}>
          <Select {...register("owner_id")}>
            <option value="">{t("Me (current user)")}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.full_name}
              </option>
            ))}
          </Select>
        </Field>
      )}
      <Field label={t("Description")}>
        <Textarea {...register("description")} rows={3} />
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
