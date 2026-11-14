import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, listTasks, updateTask } from "../api/tasks";
import type { TaskPayload } from "../api/tasks";
import { listLeads } from "../api/leads";
import { listContacts } from "../api/contacts";
import { TASK_STATUSES } from "../types";
import type { Task, TaskStatus } from "../types";
import { Badge, Button, Icon, Input, PageHeader, Select } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { TaskForm } from "../components/forms/TaskForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { formatDateTime } from "../lib/format";
import { useI18n } from "../i18n";

const PAGE_SIZE = 12;

export default function TasksPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [status, setStatus] = useState<TaskStatus | "">("");
  const [due, setDue] = useState<"overdue" | "today" | "upcoming" | "">("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ task: Task; status: TaskStatus } | null>(null);

  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const dueFilters =
    due === "overdue"
      ? { due_before: startOfToday.toISOString() }
      : due === "today"
        ? { due_after: startOfToday.toISOString(), due_before: new Date(endOfToday.getTime() + 1000).toISOString() }
        : due === "upcoming"
          ? { due_after: endOfToday.toISOString() }
          : {};

  const params = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    status: status || undefined,
    ...dueFilters,
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["tasks", params],
    queryFn: () => listTasks(params),
  });

  const { data: leadsData } = useQuery({
    queryKey: ["leads", { page: 1, page_size: 100 }],
    queryFn: () => listLeads({ page: 1, page_size: 100 }),
  });
  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { page: 1, page_size: 100 }],
    queryFn: () => listContacts({ page: 1, page_size: 100 }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["tasks"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: TaskPayload) => {
      if (editing) return updateTask(editing.id, payload);
      return createTask(payload);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      toast.push("success", editing ? t("Task updated") : t("Task created"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(taskId, { status }),
    onSuccess: (_data, variables) => {
      invalidate();
      setStatusTarget(null);
      toast.push("success", t("Task {status}", { status: t(variables.status) }));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, status, due]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Tasks")}
        subtitle={t("Follow-ups and reminders so nothing slips through.")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            data-testid="task-create"
          >
            <Icon name="plus" className="h-4 w-4" />
            {t("New Task")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e5e9f2] bg-white text-[#8a94ac]">
          <Icon name="filter" className="h-4 w-4" />
        </span>
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("Search tasks by title…")}
          className="!max-w-xs"
          data-testid="task-search"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus | "")}
          className="!max-w-[170px]"
          data-testid="task-status-filter"
        >
          <option value="">{t("All statuses")}</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t(s)}
            </option>
          ))}
        </Select>
        <Select
          value={due}
          onChange={(event) => setDue(event.target.value as typeof due)}
          className="!max-w-[170px]"
        >
          <option value="">{t("Any due date")}</option>
          <option value="overdue">{t("Overdue")}</option>
          <option value="today">{t("Due today")}</option>
          <option value="upcoming">{t("Upcoming")}</option>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label={t("Loading tasks…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t("No tasks found")}
          hint={t("Create a task to keep track of your follow-ups.")}
          action={<Button onClick={() => setFormOpen(true)}>{t("New Task")}</Button>}
        />
      ) : (
        <div className="cf-card overflow-hidden">
          <ul className="divide-y divide-[#f0f2f8]">
            {data.items.map((task) => {
              const isOverdue =
                task.status === "open" && task.due_at !== null && new Date(task.due_at) < startOfToday;
              return (
                <li
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-[#fafbff]"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[13.5px] font-semibold ${
                          task.status === "completed" || task.status === "cancelled"
                            ? "text-[#a3abc0] line-through"
                            : "text-[#303b54]"
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge value={task.status} />
                      <Badge value={task.priority} />
                      {isOverdue && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-inset ring-rose-200">
                          <Icon name="alert" className="h-3 w-3" />
                          {t("Overdue")}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-[#a3abc0]">
                      {task.related_lead ? (
                        <Link to={`/leads/${task.related_lead.id}`} className="cf-link !text-[11.5px]">
                          {task.related_lead.title}
                        </Link>
                      ) : task.related_contact ? (
                        task.related_contact.full_name
                      ) : (
                        t("No related records")
                      )}
                      {" · "}
                      {task.due_at
                        ? t("Due {date}", { date: formatDateTime(task.due_at) })
                        : t("No due date")}
                      {task.assignee ? ` · ${task.assignee.full_name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-indigo-600"
                      onClick={() => {
                        setEditing(task);
                        setFormOpen(true);
                      }}
                    >
                      {t("Edit")}
                    </button>
                    {task.status === "open" && (
                      <>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-emerald-600"
                          onClick={() => setStatusTarget({ task, status: "completed" })}
                        >
                          {t("Complete")}
                        </button>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px]"
                          onClick={() => setStatusTarget({ task, status: "cancelled" })}
                        >
                          {t("Cancel task")}
                        </button>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? t("Edit task") : t("New task")}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        wide
      >
        <TaskForm
          leads={leadsData?.items ?? []}
          contacts={contactsData?.items ?? []}
          initial={editing ?? undefined}
          busy={saveMutation.isPending}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSubmit={(payload) => saveMutation.mutate(payload)}
        />
      </Modal>

      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.status === "completed" ? t("Complete task") : t("Cancel task")}
        message={
          statusTarget?.status === "completed"
            ? t('Mark "{title}" as completed?', { title: statusTarget?.task.title ?? "" })
            : t('Cancel "{title}"? Cancelled tasks stay in the history.', {
                title: statusTarget?.task.title ?? "",
              })
        }
        confirmLabel={statusTarget?.status === "completed" ? t("Complete") : t("Cancel task")}
        danger={statusTarget?.status === "cancelled"}
        busy={statusMutation.isPending}
        onConfirm={() =>
          statusTarget && statusMutation.mutate({ taskId: statusTarget.task.id, status: statusTarget.status })
        }
        onCancel={() => setStatusTarget(null)}
      />
    </div>
  );
}
