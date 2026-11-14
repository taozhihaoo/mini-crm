import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLead, updateLead, updateLeadStage, archiveLead } from "../api/leads";
import { createActivity, type ActivityPayload } from "../api/activities";
import { createTask, updateTask, type TaskPayload } from "../api/tasks";
import { generateFollowUpDraft, generateLeadPriority, generateLeadSummary } from "../api/dashboard";
import { ALLOWED_STAGE_TRANSITIONS, LEAD_STAGES, STAGE_LABELS } from "../types";
import type { LeadPriority, LeadStage } from "../types";
import { Badge, Button, Card, Textarea, Input, Icon } from "../components/ui";
import { ConfirmDialog } from "../components/Modal";
import { ErrorState, LoadingState } from "../components/States";
import { ActivityForm } from "../components/forms/ActivityForm";
import { TaskForm } from "../components/forms/TaskForm";
import { useToast } from "../components/Toast";
import { formatDate, formatDateTime, formatMoney } from "../lib/format";
import { useI18n } from "../i18n";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

  const [activityFormOpen, setActivityFormOpen] = useState(false);
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [priorityResult, setPriorityResult] = useState<{ priority: LeadPriority; reasoning: string } | null>(null);
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [usingDraft, setUsingDraft] = useState(false);
  const [draftSubject, setDraftSubject] = useState("");
  const [draftBody, setDraftBody] = useState("");

  const { data: lead, isLoading, isError, error } = useQuery({
    queryKey: ["leads", id],
    queryFn: () => getLead(id!),
    enabled: Boolean(id),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["leads", id] });
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const stageMutation = useMutation({
    mutationFn: (stage: LeadStage) => updateLeadStage(id!, stage),
    onSuccess: () => {
      toast.push("success", t("Stage updated"));
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const summaryMutation = useMutation({
    mutationFn: () => generateLeadSummary(id!),
    onSuccess: (result) => {
      setSummary(result.summary);
      toast.push("success", t("Summary generated ({provider} provider)", { provider: result.provider }));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const priorityMutation = useMutation({
    mutationFn: () => generateLeadPriority(id!),
    onSuccess: (result) => {
      setPriorityResult({ priority: result.priority, reasoning: result.reasoning });
      toast.push("success", t("Priority suggestion ready ({provider} provider)", { provider: result.provider }));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const draftMutation = useMutation({
    mutationFn: () => generateFollowUpDraft(id!),
    onSuccess: (result) => {
      setDraft({ subject: result.subject, body: result.body });
      setUsingDraft(false);
      toast.push("success", t("Draft ready ({provider} provider)", { provider: result.provider }));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const applyPriorityMutation = useMutation({
    mutationFn: (priority: LeadPriority) => updateLead(id!, { priority }),
    onSuccess: () => {
      toast.push("success", t("Priority applied to lead"));
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const activityMutation = useMutation({
    mutationFn: (payload: ActivityPayload) => createActivity(payload),
    onSuccess: () => {
      toast.push("success", t("Activity logged"));
      setActivityFormOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const taskMutation = useMutation({
    mutationFn: (payload: TaskPayload) => createTask(payload),
    onSuccess: () => {
      toast.push("success", t("Task created"));
      setTaskFormOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: "completed" | "cancelled" }) =>
      updateTask(taskId, { status }),
    onSuccess: () => {
      toast.push("success", t("Task updated"));
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const logDraftAsEmailMutation = useMutation({
    mutationFn: () =>
      createActivity({
        type: "email",
        subject: draftSubject,
        content: draftBody,
        lead_id: id,
      }),
    onSuccess: () => {
      toast.push("success", t("Draft saved as a logged email activity"));
      setDraft(null);
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  if (isLoading) return <LoadingState label={t("Loading lead…")} />;
  if (isError || !lead)
    return <ErrorState message={error instanceof Error ? error.message : undefined} />;

  const allowedNextStages = ALLOWED_STAGE_TRANSITIONS[lead.stage];

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="mb-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#8a94ac] transition-colors hover:text-indigo-600"
        >
          <Icon name="arrowLeft" className="h-3.5 w-3.5" />
          {t("← Back to leads").replace("← ", "")}
        </button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="cf-page-title">{lead.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-[#8a94ac]">
              <Badge value={lead.stage} />
              <Badge value={lead.priority} />
              <span>·</span>
              <span className="font-semibold text-[#48526b]">{formatMoney(lead.value, lead.currency)}</span>
              <span>·</span>
              <span>{t("Owner: {name}", { name: lead.owner?.full_name ?? "-" })}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {lead.archived ? (
              <span className="rounded-lg bg-slate-100 px-3 py-2 text-[12px] font-semibold text-slate-500">
                {t("Archived")}
              </span>
            ) : (
              <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
                <Icon name="x" className="h-4 w-4" />
                {t("Archive")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stage workflow */}
      <Card className="p-5">
        <h3 className="cf-section-title">{t("Stage")}</h3>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {LEAD_STAGES.map((stage, index) => {
            const currentIndex = LEAD_STAGES.indexOf(lead.stage);
            const isPast = index < currentIndex;
            const isCurrent = stage === lead.stage;
            const isAllowed = allowedNextStages.includes(stage) && !lead.archived;
            return (
              <button
                key={stage}
                type="button"
                disabled={!isAllowed || stageMutation.isPending}
                onClick={() => stageMutation.mutate(stage)}
                title={isAllowed ? t("Move to {stage}", { stage: t(STAGE_LABELS[stage]) }) : undefined}
                className={`rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors ${
                  isCurrent
                    ? "cf-gradient-brand text-white shadow-[0_6px_16px_-8px_rgba(91,91,214,0.8)]"
                    : isPast
                      ? "bg-indigo-50 text-indigo-600"
                      : isAllowed
                        ? "border border-[#d7dceb] bg-white text-[#59637c] hover:border-indigo-400 hover:text-indigo-600"
                        : "cursor-not-allowed border border-[#eef0f7] bg-[#fafbfe] text-[#c3cade]"
                }`}
              >
                {t(STAGE_LABELS[stage])}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11.5px] text-[#a3abc0]">
          {lead.archived
            ? t("Archived leads cannot move between stages.")
            : allowedNextStages.length === 0
              ? t("This lead is in a terminal stage.")
              : t("Allowed next stages: {stages}.", {
                  stages: allowedNextStages.map((s) => t(STAGE_LABELS[s])).join(", "),
                })}
        </p>
      </Card>

      {/* Details + AI */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <h3 className="cf-section-title mb-4">{t("Details")}</h3>
          <dl className="space-y-3 text-[13px]">
            {[
              { label: t("Company"), value: lead.company?.name ?? "-" },
              { label: t("Contact"), value: lead.contact ? lead.contact.full_name : "-" },
              { label: t("Source"), value: t(lead.source) },
              { label: t("Expected close"), value: formatDate(lead.expected_close_date) },
              { label: t("Created"), value: formatDate(lead.created_at) },
            ].map((row) => (
              <div key={row.label} className="flex justify-between gap-2">
                <dt className="text-[#8a94ac]">{row.label}</dt>
                <dd className="font-semibold capitalize text-[#303b54]">{row.value}</dd>
              </div>
            ))}
          </dl>
          {lead.description && (
            <p className="mt-4 border-t cf-divider pt-4 text-[12.5px] leading-relaxed text-[#6b7590]">
              {lead.description}
            </p>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-violet-200 text-indigo-600">
                <Icon name="sparkles" className="h-4 w-4" />
              </span>
              <h3 className="cf-section-title">{t("AI Assistance")}</h3>
            </div>
            <span className="text-[11px] text-[#a3abc0]">
              {t("Suggestions only - nothing is sent automatically")}
            </span>
          </div>
          <div className="mt-4 space-y-4">
            <div>
              <Button
                variant="secondary"
                onClick={() => summaryMutation.mutate()}
                disabled={summaryMutation.isPending}
                data-testid="ai-summary-button"
              >
                <Icon name="sparkles" className="h-4 w-4" />
                {summaryMutation.isPending ? t("Generating…") : t("Generate AI Summary")}
              </Button>
              {summary && (
                <div
                  className="mt-2.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-3.5 text-[13px] leading-relaxed text-[#48526b]"
                  data-testid="ai-summary-result"
                >
                  {summary}
                </div>
              )}
            </div>

            <div>
              <Button
                variant="secondary"
                onClick={() => priorityMutation.mutate()}
                disabled={priorityMutation.isPending}
                data-testid="ai-priority-button"
              >
                <Icon name="target" className="h-4 w-4" />
                {priorityMutation.isPending ? t("Analyzing…") : t("Suggest Priority")}
              </Button>
              {priorityResult && (
                <div
                  className="mt-2.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-3.5 text-[13px] text-[#48526b]"
                  data-testid="ai-priority-result"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge value={priorityResult.priority} />
                    <Button
                      variant="secondary"
                      className="!px-2.5 !py-1.5 !text-[12px]"
                      disabled={applyPriorityMutation.isPending}
                      onClick={() => applyPriorityMutation.mutate(priorityResult.priority)}
                    >
                      {t("Apply to lead")}
                    </Button>
                  </div>
                  <p className="mt-2.5 text-[12px] leading-relaxed text-[#6b7590]">{priorityResult.reasoning}</p>
                </div>
              )}
            </div>

            <div>
              <Button
                variant="secondary"
                onClick={() => draftMutation.mutate()}
                disabled={draftMutation.isPending}
                data-testid="ai-draft-button"
              >
                <Icon name="mail" className="h-4 w-4" />
                {draftMutation.isPending ? t("Drafting…") : t("Draft Follow-up Email")}
              </Button>
              {draft && !usingDraft && (
                <div
                  className="mt-2.5 rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-violet-50/60 p-3.5"
                  data-testid="ai-draft-result"
                >
                  <p className="text-[13px] font-semibold text-[#27314a]">{draft.subject}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[12.5px] leading-relaxed text-[#59637c]">
                    {draft.body}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="!px-3 !py-1.5 !text-[12px]"
                      onClick={() => {
                        setDraftSubject(draft.subject);
                        setDraftBody(draft.body);
                        setUsingDraft(true);
                      }}
                      data-testid="use-draft-button"
                    >
                      {t("Use Draft")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-3 !py-1.5 !text-[12px]"
                      onClick={() => setDraft(null)}
                    >
                      {t("Discard")}
                    </Button>
                  </div>
                </div>
              )}
              {usingDraft && (
                <div
                  className="mt-2.5 space-y-3 rounded-xl border border-indigo-200 bg-white p-4"
                  data-testid="draft-editor"
                >
                  <Field label={t("Subject")}>
                    <Input value={draftSubject} onChange={(event) => setDraftSubject(event.target.value)} />
                  </Field>
                  <Field label={t("Body")}>
                    <Textarea rows={7} value={draftBody} onChange={(event) => setDraftBody(event.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="!text-[12px]"
                      disabled={!draftSubject.trim() || logDraftAsEmailMutation.isPending}
                      onClick={() => logDraftAsEmailMutation.mutate()}
                    >
                      {t("Log as Email Activity")}
                    </Button>
                    <Button variant="secondary" className="!text-[12px]" onClick={() => setUsingDraft(false)}>
                      {t("Back")}
                    </Button>
                    <p className="w-full text-[11.5px] text-[#a3abc0]">
                      {t("The draft stays in the CRM as a logged activity - no email is sent.")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Activities timeline */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="cf-section-title">{t("Activity Timeline")}</h3>
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 !text-[12px]"
            onClick={() => setActivityFormOpen((open) => !open)}
          >
            <Icon name={activityFormOpen ? "x" : "plus"} className="h-3.5 w-3.5" />
            {activityFormOpen ? t("Close") : t("Log Activity")}
          </Button>
        </div>
        {activityFormOpen && (
          <div className="mt-4 rounded-xl border cf-divider bg-[#fafbfe] p-4">
            <ActivityForm
              leadId={lead.id}
              busy={activityMutation.isPending}
              onCancel={() => setActivityFormOpen(false)}
              onSubmit={(payload) => activityMutation.mutate(payload)}
            />
          </div>
        )}
        <ol className="mt-5 space-y-5 border-l-2 border-[#eef0f8] pl-5">
          {lead.activities.length === 0 && (
            <p className="text-[13px] text-[#a3abc0]">{t("No activities logged for this lead yet.")}</p>
          )}
          {lead.activities.map((activity) => (
            <li key={activity.id} className="relative">
              <span className="absolute -left-[26px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 ring-2 ring-indigo-100" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={activity.type} />
                <span className="text-[13px] font-semibold text-[#303b54]">{activity.subject}</span>
                <span className="text-[11px] text-[#a3abc0]">{formatDateTime(activity.occurred_at)}</span>
              </div>
              {activity.content && (
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b7590]">{activity.content}</p>
              )}
            </li>
          ))}
        </ol>
      </Card>

      {/* Related tasks */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="cf-section-title">{t("Tasks")}</h3>
          <Button
            variant="secondary"
            className="!px-3 !py-1.5 !text-[12px]"
            onClick={() => setTaskFormOpen((open) => !open)}
          >
            <Icon name={taskFormOpen ? "x" : "plus"} className="h-3.5 w-3.5" />
            {taskFormOpen ? t("Close") : t("Add Task")}
          </Button>
        </div>
        {taskFormOpen && (
          <div className="mt-4 rounded-xl border cf-divider bg-[#fafbfe] p-4">
            <TaskForm
              defaultLeadId={lead.id}
              busy={taskMutation.isPending}
              onCancel={() => setTaskFormOpen(false)}
              onSubmit={(payload) => taskMutation.mutate(payload)}
            />
          </div>
        )}
        <ul className="mt-3 divide-y divide-[#f0f2f8]">
          {lead.tasks.length === 0 && <p className="py-3 text-[13px] text-[#a3abc0]">{t("No tasks for this lead.")}</p>}
          {lead.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-[#48526b]">{task.title}</p>
                <p className="text-[11.5px] text-[#a3abc0]">
                  {task.status === "open"
                    ? t("Due {date}", { date: formatDateTime(task.due_at) })
                    : t(task.status)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge value={task.priority} />
                {task.status === "open" && (
                  <>
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 !text-[11.5px]"
                      disabled={completeTaskMutation.isPending}
                      onClick={() => completeTaskMutation.mutate({ taskId: task.id, status: "completed" })}
                    >
                      {t("Complete")}
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2 !py-1 !text-[11.5px]"
                      disabled={completeTaskMutation.isPending}
                      onClick={() => completeTaskMutation.mutate({ taskId: task.id, status: "cancelled" })}
                    >
                      {t("Cancel")}
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-right text-[12px]">
          <Link to="/tasks" className="cf-link">
            {t("Manage all tasks →")}
          </Link>
        </p>
      </Card>

      <ConfirmDialog
        open={archiveOpen}
        title={t("Archive lead")}
        message={t('Archive "{title}"? It will be hidden from lists until restored.', { title: lead.title })}
        confirmLabel={t("Archive")}
        danger
        busy={false}
        onConfirm={() => {
          archiveLead(lead.id)
            .then(() => {
              toast.push("success", t("Lead archived"));
              navigate("/leads");
            })
            .catch((err: Error) => toast.push("error", err.message));
        }}
        onCancel={() => setArchiveOpen(false)}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-[12px] font-semibold text-[#59637c]">{label}</span>
      {children}
    </label>
  );
}
