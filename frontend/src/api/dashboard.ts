import { api } from "./client";
import type { DashboardStats, AISummaryResponse, AIPriorityResponse, AIFollowUpResponse } from "../types";

export async function getDashboard() {
  return api.get<DashboardStats>("/dashboard");
}

export async function generateLeadSummary(leadId: string) {
  return api.post<AISummaryResponse>(`/ai/leads/${leadId}/summary`);
}

export async function generateLeadPriority(leadId: string) {
  return api.post<AIPriorityResponse>(`/ai/leads/${leadId}/priority`);
}

export async function generateFollowUpDraft(leadId: string) {
  return api.post<AIFollowUpResponse>(`/ai/leads/${leadId}/follow-up`);
}
