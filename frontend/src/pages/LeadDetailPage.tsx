import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getLead, updateLead, updateLeadStage, archiveLead } from "../api/leads";
import { createActivity, type ActivityPayload } from "../api/activities";
import { createTask, updateTask, type TaskPayload } from "../api/tasks";
import { generateFollowUpDraft, generateLeadPriority, generateLeadSummary } from "../api/dashboard";
import {
  ALLOWED_STAGE_TRANSITIONS,
  LEAD_STAGES,
  STAGE_LABELS,
} from "../types";
import type { LeadPriority, LeadStage } from "../types";
import { Badge, Button, Card, Textarea, Input } from "../components/ui";
import { ConfirmDialog } from "../components/Modal";
import { ErrorState, LoadingState } from "../components/States";
import { ActivityForm } from "../components/forms/ActivityForm";
import { TaskForm } from "../components/forms/TaskForm";
import { useToast } from "../components/Toast";
import { formatDate, formatDateTime, formatMoney } from "../lib/format";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();

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
      toast.push("success", "Stage updated");
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const summaryMutation = useMutation({
    mutationFn: () => generateLeadSummary(id!),
    onSuccess: (result) => {
      setSummary(result.summary);
      toast.push("success", `Summary generated (${result.provider} provider)`);
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const priorityMutation = useMutation({
    mutationFn: () => generateLeadPriority(id!),
    onSuccess: (result) => {
      setPriorityResult({ priority: result.priority, reasoning: result.reasoning });
      toast.push("success", `Priority suggestion ready (${result.provider} provider)`);
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const draftMutation = useMutation({
    mutationFn: () => generateFollowUpDraft(id!),
    onSuccess: (result) => {
      setDraft({ subject: result.subject, body: result.body });
      setUsingDraft(false);
      toast.push("success", `Draft ready (${result.provider} provider)`);
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const applyPriorityMutation = useMutation({
    mutationFn: (priority: LeadPriority) => updateLead(id!, { priority }),
    onSuccess: () => {
      toast.push("success", "Priority applied to lead");
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const activityMutation = useMutation({
    mutationFn: (payload: ActivityPayload) => createActivity(payload),
    onSuccess: () => {
      toast.push("success", "Activity logged");
      setActivityFormOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const taskMutation = useMutation({
    mutationFn: (payload: TaskPayload) => createTask(payload),
    onSuccess: () => {
      toast.push("success", "Task created");
      setTaskFormOpen(false);
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const completeTaskMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: "completed" | "cancelled" }) =>
      updateTask(taskId, { status }),
    onSuccess: () => {
      toast.push("success", "Task updated");
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
      toast.push("success", "Draft saved as a logged email activity");
      setDraft(null);
      refresh();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  if (isLoading) return <LoadingState label="Loading lead…" />;
  if (isError || !lead)
    return <ErrorState message={error instanceof Error ? error.message : undefined} />;

  const allowedNextStages = ALLOWED_STAGE_TRANSITIONS[lead.stage];

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate("/leads")}
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to leads
        </button>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{lead.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
              <Badge value={lead.stage} />
              <Badge value={lead.priority} />
              <span>·</span>
              <span>{formatMoney(lead.value, lead.currency)}</span>
              <span>·</span>
              <span>Owner: {lead.owner?.full_name ?? "-"}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {lead.archived ? (
              <span className="rounded bg-slate-200 px-2 py-1 text-xs text-slate-600">Archived</span>
            ) : (
              <Button variant="secondary" onClick={() => setArchiveOpen(true)}>
                Archive
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stage workflow */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold text-slate-800">Stage</h3>
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
                title={isAllowed ? `Move to ${STAGE_LABELS[stage]}` : undefined}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  isCurrent
                    ? "bg-indigo-600 text-white"
                    : isPast
                      ? "bg-indigo-100 text-indigo-700"
                      : isAllowed
                        ? "border border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:text-indigo-600"
                        : "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-300"
                }`}
              >
                {STAGE_LABELS[stage]}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {lead.archived
            ? "Archived leads cannot move between stages."
            : allowedNextStages.length === 0
              ? "This lead is in a terminal stage."
              : `Allowed next stages: ${allowedNextStages.map((s) => STAGE_LABELS[s]).join(", ")}.`}
        </p>
      </Card>

      {/* Details */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-800">Details</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Company</dt>
              <dd className="font-medium text-slate-800">{lead.company?.name ?? "-"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Contact</dt>
              <dd className="font-medium text-slate-800">
                {lead.contact ? `${lead.contact.full_name}` : "-"}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Source</dt>
              <dd className="capitalize text-slate-800">{lead.source.replace(/_/g, " ")}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Expected close</dt>
              <dd className="text-slate-800">{formatDate(lead.expected_close_date)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-800">{formatDate(lead.created_at)}</dd>
            </div>
          </dl>
          {lead.description && (
            <p className="mt-3 border-t border-slate-100 pt-3 text-sm text-slate-600">{lead.description}</p>
          )}
        </Card>

        {/* AI panel */}
        <Card className="p-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">AI Assistance</h3>
            <span className="text-xs text-slate-400">Suggestions only - nothing is sent automatically</span>
          </div>
          <div className="mt-3 space-y-4">
            <div>
              <Button
                variant="secondary"
                onClick={() => summaryMutation.mutate()}
                disabled={summaryMutation.isPending}
                data-testid="ai-summary-button"
              >
                {summaryMutation.isPending ? "Generating…" : "Generate AI Summary"}
              </Button>
              {summary && (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-slate-700" data-testid="ai-summary-result">
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
                {priorityMutation.isPending ? "Analyzing…" : "Suggest Priority"}
              </Button>
              {priorityResult && (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3 text-sm text-slate-700" data-testid="ai-priority-result">
                  <div className="flex items-center justify-between gap-2">
                    <Badge value={priorityResult.priority} />
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      disabled={applyPriorityMutation.isPending}
                      onClick={() => applyPriorityMutation.mutate(priorityResult.priority)}
                    >
                      Apply to lead
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-600">{priorityResult.reasoning}</p>
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
                {draftMutation.isPending ? "Drafting…" : "Draft Follow-up Email"}
              </Button>
              {draft && !usingDraft && (
                <div className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/60 p-3" data-testid="ai-draft-result">
                  <p className="text-sm font-medium text-slate-800">{draft.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{draft.body}</p>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="!px-2.5 !py-1.5 text-xs"
                      onClick={() => {
                        setDraftSubject(draft.subject);
                        setDraftBody(draft.body);
                        setUsingDraft(true);
                      }}
                      data-testid="use-draft-button"
                    >
                      Use Draft
                    </Button>
                    <Button variant="ghost" className="!px-2.5 !py-1.5 text-xs" onClick={() => setDraft(null)}>
                      Discard
                    </Button>
                  </div>
                </div>
              )}
              {usingDraft && (
                <div className="mt-2 space-y-2 rounded-lg border border-indigo-200 bg-white p-3" data-testid="draft-editor">
                  <Field label="Subject">
                    <Input value={draftSubject} onChange={(event) => setDraftSubject(event.target.value)} />
                  </Field>
                  <Field label="Body">
                    <Textarea rows={7} value={draftBody} onChange={(event) => setDraftBody(event.target.value)} />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!draftSubject.trim() || logDraftAsEmailMutation.isPending}
                      onClick={() => logDraftAsEmailMutation.mutate()}
                    >
                      Log as Email Activity
                    </Button>
                    <Button variant="secondary" onClick={() => setUsingDraft(false)}>
                      Back
                    </Button>
                    <p className="w-full text-xs text-slate-400">
                      The draft stays in the CRM as a logged activity - no email is sent.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Activities timeline */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Activity Timeline</h3>
          <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => setActivityFormOpen((open) => !open)}>
            {activityFormOpen ? "Close" : "Log Activity"}
          </Button>
        </div>
        {activityFormOpen && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <ActivityForm
              leadId={lead.id}
              busy={activityMutation.isPending}
              onCancel={() => setActivityFormOpen(false)}
              onSubmit={(payload) => activityMutation.mutate(payload)}
            />
          </div>
        )}
        <ol className="mt-4 space-y-4 border-l-2 border-slate-100 pl-4">
          {lead.activities.length === 0 && (
            <p className="text-sm text-slate-400">No activities logged for this lead yet.</p>
          )}
          {lead.activities.map((activity) => (
            <li key={activity.id} className="relative">
              <span className="absolute -left-[22px] top-1.5 h-3 w-3 rounded-full border-2 border-white bg-indigo-500" />
              <div className="flex flex-wrap items-center gap-2">
                <Badge value={activity.type} />
                <span className="text-sm font-medium text-slate-800">{activity.subject}</span>
                <span className="text-xs text-slate-400">{formatDateTime(activity.occurred_at)}</span>
              </div>
              {activity.content && <p className="mt-1 text-sm text-slate-600">{activity.content}</p>}
            </li>
          ))}
        </ol>
      </Card>

      {/* Related tasks */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Tasks</h3>
          <Button variant="secondary" className="!px-2.5 !py-1.5 text-xs" onClick={() => setTaskFormOpen((open) => !open)}>
            {taskFormOpen ? "Close" : "Add Task"}
          </Button>
        </div>
        {taskFormOpen && (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <TaskForm
              defaultLeadId={lead.id}
              busy={taskMutation.isPending}
              onCancel={() => setTaskFormOpen(false)}
              onSubmit={(payload) => taskMutation.mutate(payload)}
            />
          </div>
        )}
        <ul className="mt-3 divide-y divide-slate-50">
          {lead.tasks.length === 0 && <p className="py-2 text-sm text-slate-400">No tasks for this lead.</p>}
          {lead.tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm text-slate-700">{task.title}</p>
                <p className="text-xs text-slate-400">
                  {task.status === "open" ? `Due ${formatDateTime(task.due_at)}` : task.status}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Badge value={task.priority} />
                {task.status === "open" && (
                  <>
                    <Button
                      variant="secondary"
                      className="!px-2 !py-1 text-xs"
                      disabled={completeTaskMutation.isPending}
                      onClick={() => completeTaskMutation.mutate({ taskId: task.id, status: "completed" })}
                    >
                      Complete
                    </Button>
                    <Button
                      variant="ghost"
                      className="!px-2 !py-1 text-xs"
                      disabled={completeTaskMutation.isPending}
                      onClick={() => completeTaskMutation.mutate({ taskId: task.id, status: "cancelled" })}
                    >
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-right text-xs">
          <Link to="/tasks" className="font-medium text-indigo-600 hover:text-indigo-700">
            Manage all tasks →
          </Link>
        </p>
      </Card>

      <ConfirmDialog
        open={archiveOpen}
        title="Archive lead"
        message={`Archive "${lead.title}"? It will be hidden from lists until restored.`}
        confirmLabel="Archive"
        danger
        busy={false}
        onConfirm={() => {
          archiveLead(lead.id)
            .then(() => {
              toast.push("success", "Lead archived");
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
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
