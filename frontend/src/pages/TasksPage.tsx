import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTask, listTasks, updateTask } from "../api/tasks";
import type { TaskPayload } from "../api/tasks";
import { listLeads } from "../api/leads";
import { listContacts } from "../api/contacts";
import { TASK_STATUSES } from "../types";
import type { Task, TaskStatus } from "../types";
import { Badge, Button, Input, Select } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { TaskForm } from "../components/forms/TaskForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { formatDateTime } from "../lib/format";

const PAGE_SIZE = 12;

export default function TasksPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
      toast.push("success", editing ? "Task updated" : "Task created");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: TaskStatus }) =>
      updateTask(taskId, { status }),
    onSuccess: (_data, variables) => {
      invalidate();
      setStatusTarget(null);
      toast.push("success", `Task ${variables.status}`);
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, status, due]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500">Follow-ups and reminders so nothing slips through.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          data-testid="task-create"
        >
          New Task
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search tasks by title…"
          className="max-w-xs"
          data-testid="task-search"
        />
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as TaskStatus | "")}
          className="max-w-40"
          data-testid="task-status-filter"
        >
          <option value="">All statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Select value={due} onChange={(event) => setDue(event.target.value as typeof due)} className="max-w-40">
          <option value="">Any due date</option>
          <option value="overdue">Overdue</option>
          <option value="today">Due today</option>
          <option value="upcoming">Upcoming</option>
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading tasks…" />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No tasks found"
          hint="Create a task to keep track of your follow-ups."
          action={<Button onClick={() => setFormOpen(true)}>New Task</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <ul className="divide-y divide-slate-100">
            {data.items.map((task) => {
              const isOverdue =
                task.status === "open" && task.due_at !== null && new Date(task.due_at) < startOfToday;
              return (
                <li key={task.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          task.status === "completed" || task.status === "cancelled"
                            ? "text-slate-400 line-through"
                            : "text-slate-800"
                        }`}
                      >
                        {task.title}
                      </span>
                      <Badge value={task.status} />
                      <Badge value={task.priority} />
                      {isOverdue && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {task.related_lead ? (
                        <Link to={`/leads/${task.related_lead.id}`} className="text-indigo-600 hover:text-indigo-700">
                          {task.related_lead.title}
                        </Link>
                      ) : task.related_contact ? (
                        task.related_contact.full_name
                      ) : (
                        "No related records"
                      )}
                      {" · "}
                      {task.due_at ? `Due ${formatDateTime(task.due_at)}` : "No due date"}
                      {task.assignee ? ` · ${task.assignee.full_name}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                      onClick={() => {
                        setEditing(task);
                        setFormOpen(true);
                      }}
                    >
                      Edit
                    </button>
                    {task.status === "open" && (
                      <>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50"
                          onClick={() => setStatusTarget({ task, status: "completed" })}
                        >
                          Complete
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                          onClick={() => setStatusTarget({ task, status: "cancelled" })}
                        >
                          Cancel task
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
        title={editing ? "Edit task" : "New task"}
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
        title={statusTarget?.status === "completed" ? "Complete task" : "Cancel task"}
        message={
          statusTarget?.status === "completed"
            ? `Mark "${statusTarget?.task.title}" as completed?`
            : `Cancel "${statusTarget?.task.title}"? Cancelled tasks stay in the history.`
        }
        confirmLabel={statusTarget?.status === "completed" ? "Complete" : "Cancel task"}
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
