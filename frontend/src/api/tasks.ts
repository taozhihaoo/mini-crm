import { api } from "./client";
import type { Page, ListParams, Task, TaskStatus, LeadPriority } from "../types";

export type TaskPayload = {
  title: string;
  description?: string | null;
  related_lead_id?: string | null;
  related_contact_id?: string | null;
  due_at?: string | null;
  priority?: LeadPriority;
  assigned_to?: string | null;
};

export async function listTasks(
  params: ListParams & {
    status?: TaskStatus;
    priority?: LeadPriority;
    assigned_to?: string;
    related_lead_id?: string;
    related_contact_id?: string;
    due_before?: string;
    due_after?: string;
  },
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<Task>>(`/tasks?${query.toString()}`);
}

export async function createTask(payload: TaskPayload) {
  return api.post<Task>("/tasks", payload);
}

export async function updateTask(id: string, payload: Partial<TaskPayload> & { status?: TaskStatus }) {
  return api.patch<Task>(`/tasks/${id}`, payload);
}
