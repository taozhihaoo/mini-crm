import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createActivity, listActivities, updateActivity } from "../api/activities";
import type { ActivityPayload } from "../api/activities";
import { listLeads } from "../api/leads";
import { listContacts } from "../api/contacts";
import { ACTIVITY_TYPES } from "../types";
import type { Activity, ActivityType } from "../types";
import { Badge, Button, Field, Icon, PageHeader, Select } from "../components/ui";
import { Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { ActivityForm } from "../components/forms/ActivityForm";
import { useToast } from "../components/Toast";
import { formatDateTime } from "../lib/format";
import { useI18n } from "../i18n";

const PAGE_SIZE = 15;

export default function ActivitiesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

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
      toast.push("success", editing ? t("Activity updated") : t("Activity logged"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [type]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Activities")}
        subtitle={t("Every call, email, meeting and note across your CRM.")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            data-testid="activity-create"
          >
            <Icon name="plus" className="h-4 w-4" />
            {t("Log Activity")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e9f2] bg-white text-[#8a94ac]">
          <Icon name="filter" className="h-4 w-4" />
        </span>
        <Select
          value={type}
          onChange={(event) => setType(event.target.value as ActivityType | "")}
          className="!max-w-[170px]"
          data-testid="activity-type-filter"
        >
          <option value="">{t("All types")}</option>
          {ACTIVITY_TYPES.map((item) => (
            <option key={item} value={item}>
              {t(item)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label={t("Loading activities…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t("No activities yet")}
          hint={t("Log a call, email, meeting or note to start building history.")}
          action={<Button onClick={() => setFormOpen(true)}>{t("Log Activity")}</Button>}
        />
      ) : (
        <div className="cf-card overflow-hidden">
          <ul className="divide-y divide-[#f0f2f8]">
            {data.items.map((activity) => (
              <li
                key={activity.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#fafbff]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <Badge value={activity.type} />
                    <span className="text-[13.5px] font-semibold text-[#303b54]">{activity.subject}</span>
                  </div>
                  {activity.content && <p className="mt-1 truncate text-[12.5px] text-[#8a94ac]">{activity.content}</p>}
                  <p className="mt-1.5 text-[11.5px] text-[#a3abc0]">
                    {activity.lead ? (
                      <Link to={`/leads/${activity.lead.id}`} className="cf-link !text-[11.5px]">
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
                  className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-indigo-600"
                  onClick={() => {
                    setEditing(activity);
                    setFormOpen(true);
                  }}
                >
                  {t("Edit")}
                </button>
              </li>
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? t("Edit activity") : t("Log activity")}
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
  const { t } = useI18n();
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
          <Field label={t("Related lead")}>
            <Select
              value={leadId}
              onChange={(event) => setLeadId(event.target.value)}
              data-testid="activity-lead-select"
            >
              <option value="">{t("None")}</option>
              {(leadsData?.items ?? []).map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("Related contact")}>
            <Select value={contactId} onChange={(event) => setContactId(event.target.value)}>
              <option value="">{t("None")}</option>
              {(contactsData?.items ?? []).map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {contact.full_name}
                </option>
              ))}
            </Select>
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
