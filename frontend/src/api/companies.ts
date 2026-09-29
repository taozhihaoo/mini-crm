import { api } from "./client";
import type { Page, ListParams, Company, CompanyDetail, ImportSummary } from "../types";

export type CompanyPayload = {
  name: string;
  website?: string | null;
  industry?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
};

export async function listCompanies(
  params: ListParams & { industry?: string; include_archived?: boolean },
) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<Company>>(`/companies?${query.toString()}`);
}

export async function getCompany(id: string) {
  return api.get<CompanyDetail>(`/companies/${id}`);
}

export async function createCompany(payload: CompanyPayload) {
  return api.post<Company>("/companies", payload);
}

export async function updateCompany(id: string, payload: Partial<CompanyPayload>) {
  return api.patch<Company>(`/companies/${id}`, payload);
}

export async function archiveCompany(id: string) {
  return api.post<Company>(`/companies/${id}/archive`);
}

export async function unarchiveCompany(id: string) {
  return api.post<Company>(`/companies/${id}/unarchive`);
}

export async function importCompanies(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm<ImportSummary>("/import/companies", formData);
}
