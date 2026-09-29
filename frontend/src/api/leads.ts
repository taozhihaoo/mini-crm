import { api } from "./client";
import type {
  Page,
  ListParams,
  Lead,
  LeadDetail,
  LeadStage,
  LeadPriority,
  LeadSource,
} from "../types";

export type LeadPayload = {
  company_id: string;
  contact_id: string;
  title: string;
  description?: string | null;
  value?: string;
  currency?: string;
  stage?: LeadStage;
  priority?: LeadPriority;
  source?: LeadSource;
  expected_close_date?: string | null;
  owner_id?: string;
};

export async function listLeads(
  params: ListParams & {
    stage?: LeadStage;
    priority?: LeadPriority;
    owner_id?: string;
    company_id?: string;
    contact_id?: string;
  },
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<Lead>>(`/leads?${query.toString()}`);
}

export async function getLead(id: string) {
  return api.get<LeadDetail>(`/leads/${id}`);
}

export async function createLead(payload: LeadPayload) {
  return api.post<Lead>("/leads", payload);
}

export async function updateLead(id: string, payload: Partial<LeadPayload>) {
  return api.patch<Lead>(`/leads/${id}`, payload);
}

export async function updateLeadStage(id: string, stage: LeadStage) {
  return api.patch<Lead>(`/leads/${id}/stage`, { stage });
}

export async function archiveLead(id: string) {
  return api.post<Lead>(`/leads/${id}/archive`);
}

export async function unarchiveLead(id: string) {
  return api.post<Lead>(`/leads/${id}/unarchive`);
}
