import { useForm } from "react-hook-form";
import type { ActivityType } from "../../types";
import { ACTIVITY_TYPES } from "../../types";
import { Button, Field, Input, Select, Textarea } from "../ui";
import type { ActivityPayload } from "../../api/activities";
import { useI18n } from "../../i18n";

interface ActivityFormValues {
  type: ActivityType;
  subject: string;
  content: string;
}

export function ActivityForm({
  leadId,
  contactId,
  companyId,
  onSubmit,
  onCancel,
  busy,
  submitLabel,
}: {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  onSubmit: (payload: ActivityPayload) => void;
  onCancel?: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { t } = useI18n();
  const { register, handleSubmit, formState } = useForm<ActivityFormValues>({
    defaultValues: { type: "note", subject: "", content: "" },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onSubmit({
          type: values.type,
          subject: values.subject,
          content: values.content || null,
          lead_id: leadId,
          contact_id: contactId,
          company_id: companyId,
        });
      })}
      className="space-y-4"
      noValidate
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Type")} required>
          <Select {...register("type")} data-testid="activity-type">
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(type)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Subject")} required error={formState.errors.subject?.message}>
          <Input {...register("subject", { required: t("Subject is required") })} data-testid="activity-subject" />
        </Field>
      </div>
      <Field label={t("Notes")}>
        <Textarea {...register("content")} rows={3} placeholder={t("What was discussed?")} />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            {t("Cancel")}
          </Button>
        )}
        <Button type="submit" disabled={busy}>
          {busy ? t("Saving…") : (submitLabel ?? t("Log activity"))}
        </Button>
      </div>
    </form>
  );
}
