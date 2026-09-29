import { api } from "./client";
import type { Page, User, Role, ListParams, ImportSummary, AuditLog, ListParams as P } from "../types";

export async function login(email: string, password: string) {
  return api.post<{ access_token: string; token_type: string; user: User }>("/auth/login", {
    email,
    password,
  });
}

export async function getMe() {
  return api.get<User>("/auth/me");
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return api.post<void>("/auth/change-password", {
    current_password: currentPassword,
    new_password: newPassword,
  });
}

export async function listUsers(params: P) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<User>>(`/users?${query.toString()}`);
}

export async function createUser(payload: { email: string; password: string; full_name: string; role: Role }) {
  return api.post<User>("/users", payload);
}

export async function updateUser(
  id: string,
  payload: { full_name?: string; role?: Role; is_active?: boolean; password?: string },
) {
  return api.patch<User>(`/users/${id}`, payload);
}

export async function importContacts(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return api.postForm<ImportSummary>("/import/contacts", formData);
}

export async function listAuditLogs(params: ListParams & { action?: string; entity_type?: string }) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<AuditLog>>(`/audit-logs?${query.toString()}`);
}
