import { api } from "./client";
import type { Page, ListParams, Contact, ContactDetail } from "../types";

export type ContactPayload = {
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  job_title?: string | null;
  notes?: string | null;
};

export async function listContacts(params: ListParams & { company_id?: string }) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  });
  return api.get<Page<Contact>>(`/contacts?${query.toString()}`);
}

export async function getContact(id: string) {
  return api.get<ContactDetail>(`/contacts/${id}`);
}

export async function createContact(payload: ContactPayload) {
  return api.post<Contact>("/contacts", payload);
}

export async function updateContact(id: string, payload: Partial<ContactPayload>) {
  return api.patch<Contact>(`/contacts/${id}`, payload);
}

export async function archiveContact(id: string) {
  return api.post<Contact>(`/contacts/${id}/archive`);
}

export async function unarchiveContact(id: string) {
  return api.post<Contact>(`/contacts/${id}/unarchive`);
}
