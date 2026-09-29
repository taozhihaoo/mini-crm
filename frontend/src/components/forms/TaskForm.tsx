import { useForm } from "react-hook-form";
import type { ContactBrief, Lead, LeadBrief, LeadPriority, Task } from "../../types";
import { PRIORITIES } from "../../types";
import { Field, Input, Select, Textarea } from "../ui";
import type { TaskPayload } from "../../api/tasks";

interface TaskFormValues {
  title: string;
  description: string;
  related_lead_id: string;
  related_contact_id: string;
  due_at: string;
  priority: LeadPriority;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function TaskForm({
  leads,
  contacts,
  initial,
  defaultLeadId,
  defaultContactId,
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Save",
}: {
  leads?: LeadBrief[] | Lead[];
  contacts?: ContactBrief[];
  initial?: Task;
  defaultLeadId?: string;
  defaultContactId?: string;
  onSubmit: (payload: TaskPayload) => void;
  onCancel: () => void;
  busy?: boolean;
  submitLabel?: string;
}) {
  const { register, handleSubmit, formState } = useForm<TaskFormValues>({
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      related_lead_id: initial?.related_lead_id ?? defaultLeadId ?? "",
      related_contact_id: initial?.related_contact_id ?? defaultContactId ?? "",
      due_at: toDatetimeLocal(initial?.due_at ?? null),
      priority: initial?.priority ?? "medium",
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onSubmit({
          title: values.title,
          description: values.description || null,
          related_lead_id: values.related_lead_id || null,
          related_contact_id: values.related_contact_id || null,
          due_at: values.due_at ? new Date(values.due_at).toISOString() : null,
          priority: values.priority,
        });
      })}
      className="space-y-4"
      noValidate
    >
      <Field label="Title" required error={formState.errors.title?.message}>
        <Input {...register("title", { required: "Title is required" })} data-testid="task-title" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Related lead">
          <Select {...register("related_lead_id")}>
            <option value="">None</option>
            {(leads ?? []).map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Related contact">
          <Select {...register("related_contact_id")}>
            <option value="">None</option>
            {(contacts ?? []).map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.full_name || `${contact.first_name} ${contact.last_name}`}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Due at">
          <Input {...register("due_at")} type="datetime-local" />
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
      </div>
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
