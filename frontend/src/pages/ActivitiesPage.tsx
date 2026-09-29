import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActivity, listActivities, updateActivity } from "../api/activities";
import type { ActivityPayload } from "../api/activities";
import { listLeads } from "../api/leads";
import { listContacts } from "../api/contacts";
import { ACTIVITY_TYPES } from "../types";
import type { Activity, ActivityType } from "../types";
import { Badge, Button, Field, Select } from "../components/ui";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { ActivityForm } from "../components/forms/ActivityForm";
import { useToast } from "../components/Toast";
import { formatDateTime } from "../lib/format";

const PAGE_SIZE = 15;

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [type, setType] = useState<ActivityType | "">("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Activity | null>(null);

  const params = { page, page_size: PAGE_SIZE, type: type || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["activities", params],
    queryFn: () => listActivities(params),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: ActivityPayload) => {
      if (editing) return updateActivity(editing.id, payload);
      return createActivity(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setFormOpen(false);
      setEditing(null);
      toast.push("success", editing ? "Activity updated" : "Activity logged");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [type]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Activities</h1>
          <p className="text-sm text-slate-500">Every call, email, meeting and note across your CRM.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          data-testid="activity-create"
        >
          Log Activity
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType | "")}
          className="max-w-40"
          data-testid="activity-type-filter"
        >
          <option value="">All types</option>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading activities…" />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No activities yet"
          hint="Log a call, email, meeting or note to start building history."
          action={<Button onClick={() => setFormOpen(true)}>Log Activity</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {data.items.map((activity) => (
              <li key={activity.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge value={activity.type} />
                    <span className="text-sm font-medium text-slate-800">{activity.subject}</span>
                  </div>
                  {activity.content && <p className="mt-0.5 truncate text-sm text-slate-500">{activity.content}</p>}
                  <p className="mt-0.5 text-xs text-slate-400">
                    {activity.lead ? (
                      <Link to={`/leads/${activity.lead.id}`} className="text-indigo-600 hover:text-indigo-700">
                        {activity.lead.title}
                      </Link>
                    ) : activity.company ? (
                      activity.company.name
                    ) : (
                      activity.contact?.full_name
                    )}
                    {" · "}
                    {formatDateTime(activity.occurred_at)}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                  onClick={() => {
                    setEditing(activity);
                    setFormOpen(true);
                  }}
                >
                  Edit
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit activity" : "Log activity"}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      >
        <LinkedActivityForm
          editing={editing}
          busy={saveMutation.isPending}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={(payload) => saveMutation.mutate(payload)}
        />
      </Modal>
    </div>
  );
}

/** Create needs a lead/contact/company link; edits keep their existing links. */
function LinkedActivityForm({
  editing,
  busy,
  onCancel,
  onSubmit,
}: {
  editing: Activity | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (payload: ActivityPayload) => void;
}) {
  const [leadId, setLeadId] = useState(editing?.lead_id ?? "");
  const [contactId, setContactId] = useState(editing?.contact_id ?? "");
  const { data: leadsData } = useQuery({
    queryKey: ["leads", { page: 1, page_size: 100 }],
    queryFn: () => listLeads({ page: 1, page_size: 100 }),
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { page: 1, page_size: 100 }],
    queryFn: () => listContacts({ page: 1, page_size: 100 }),
  });

  return (
    <div className="space-y-4">
      {!editing && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Related lead">
            <select
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
              data-testid="activity-lead-select"
            >
              <option value="">None</option>
              {(leadsData?.items ?? []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.title}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Related contact">
            <select
              value={contactId}
              onChange={(event) => setContactId(event.target.value)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">None</option>
              {(contactsData?.items ?? []).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}
      <ActivityForm
        leadId={leadId || undefined}
        contactId={contactId || undefined}
        busy={busy}
        onCancel={onCancel}
        onSubmit={onSubmit}
      />
    </div>
  );
}
