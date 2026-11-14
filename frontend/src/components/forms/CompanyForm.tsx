import { useForm } from "react-hook-form";
import type { Company } from "../../types";
import { Button, Field, Input, Textarea } from "../ui";
import type { CompanyPayload } from "../../api/companies";
import { emptyToNull } from "../../lib/emptyToNull";
import { useI18n } from "../../i18n";

export function CompanyForm({
  initial,
  onSubmit,
  onCancel,
  busy,
  submitLabel,
}: {
  initial?: Company;
  onSubmit: (payload: CompanyPayload) => void;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { t } = useI18n();
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
    <form
      onSubmit={handleSubmit((values) => onSubmit(emptyToNull(values)))}
      className="space-y-4"
      noValidate
    >
      <Field label={t("Name")} required error={formState.errors.name?.message}>
        <Input
          {...register("name", { required: t("Name is required"), maxLength: 255 })}
          data-testid="company-name"
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Website")}>
          <Input {...register("website")} placeholder={t("https://")} />
        </Field>
        <Field label={t("Industry")}>
          <Input {...register("industry")} />
        </Field>
        <Field label={t("Phone")}>
          <Input {...register("phone")} />
        </Field>
        <Field label={t("Email")} error={formState.errors.email?.message}>
          <Input {...register("email")} type="email" />
        </Field>
      </div>
      <Field label={t("Address")}>
        <Input {...register("address")} />
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
