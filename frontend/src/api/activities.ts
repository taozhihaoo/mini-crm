import { api } from "./client";
import type { Page, ListParams, Activity, ActivityType } from "../types";

export type ActivityPayload = {
  type: ActivityType;
  subject: string;
  content?: string | null;
  company_id?: string | null;
  contact_id?: string | null;
  lead_id?: string | null;
  occurred_at?: string | null;
};

export async function listActivities(
  params: ListParams & {
    lead_id?: string;
    contact_id?: string;
    company_id?: string;
    type?: ActivityType;
  },
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<Activity>>(`/activities?${query.toString()}`);
}

export async function createActivity(payload: ActivityPayload) {
  return api.post<Activity>("/activities", payload);
}

export async function updateActivity(id: string, payload: Partial<ActivityPayload>) {
  return api.patch<Activity>(`/activities/${id}`, payload);
}
