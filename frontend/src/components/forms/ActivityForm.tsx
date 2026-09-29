import { useForm } from "react-hook-form";
import type { ActivityType } from "../../types";
import { ACTIVITY_TYPES } from "../../types";
import { Field, Input, Select, Textarea } from "../ui";
import type { ActivityPayload } from "../../api/activities";

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
  submitLabel = "Log activity",
}: {
  leadId?: string;
  contactId?: string;
  companyId?: string;
  onSubmit: (payload: ActivityPayload) => void;
  onCancel?: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
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
        <Field label="Type" required>
          <Select {...register("type")} data-testid="activity-type">
            {ACTIVITY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject" required error={formState.errors.subject?.message}>
          <Input {...register("subject", { required: "Subject is required" })} data-testid="activity-subject" />
        </Field>
      </div>
      <Field label="Notes">
        <Textarea {...register("content")} rows={3} placeholder="What was discussed?" />
      </Field>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
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
