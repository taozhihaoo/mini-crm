import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveContact,
  createContact,
  listContacts,
  unarchiveContact,
  updateContact,
} from "../api/contacts";
import type { ContactPayload } from "../api/contacts";
import { listCompanies } from "../api/companies";
import type { Company, Contact } from "../types";
import { Button, Input } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { ContactForm } from "../components/forms/ContactForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";

const PAGE_SIZE = 10;

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [companyId, setCompanyId] = useState("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Contact | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: ["companies", { page: 1, page_size: 100 }],
    queryFn: () => listCompanies({ page: 1, page_size: 100, sort_by: "name", order: "asc" }),
  });
  const companies: Company[] = companiesData?.items ?? [];

  const params = { page, page_size: PAGE_SIZE, search: search || undefined, company_id: companyId || undefined };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["contacts", params],
    queryFn: () => listContacts(params),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["contacts"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: ContactPayload) => {
      if (editing) return updateContact(editing.id, payload);
      return createContact(payload);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      toast.push("success", editing ? "Contact updated" : "Contact created");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (contact: Contact) =>
      contact.archived ? unarchiveContact(contact.id) : archiveContact(contact.id),
    onSuccess: (_data, contact) => {
      invalidate();
      setArchiveTarget(null);
      toast.push("success", contact.archived ? "Contact restored" : "Contact archived");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, companyId]);

  const companyName = (id: string) => companies.find((company) => company.id === id)?.name ?? "-";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contacts</h1>
          <p className="text-sm text-slate-500">People you work with at each company.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          data-testid="contact-create"
        >
          New Contact
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or email…"
          className="max-w-xs"
          data-testid="contact-search"
        />
        <select
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="">All companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading contacts…" />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No contacts found"
          hint="Create a contact or adjust your filters."
          action={<Button onClick={() => setFormOpen(true)}>New Contact</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="hidden px-4 py-3 md:table-cell">Email</th>
                  <th className="hidden px-4 py-3 md:table-cell">Job title</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Phone</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((contact) => (
                  <tr key={contact.id} className={contact.archived ? "opacity-60" : undefined}>
                    <td className="px-4 py-3 font-medium text-slate-800">{contact.full_name}</td>
                    <td className="px-4 py-3">
                      <Link
                        to="/companies"
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        {companyName(contact.company_id)}
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{contact.email}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{contact.job_title ?? "-"}</td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{contact.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            setEditing(contact);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          onClick={() => setArchiveTarget(contact)}
                        >
                          {contact.archived ? "Restore" : "Archive"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        </div>
      )}

      <Modal
        open={formOpen}
        title={editing ? "Edit contact" : "New contact"}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        wide
      >
        <ContactForm
          companies={companies}
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
        open={archiveTarget !== null}
        title={archiveTarget?.archived ? "Restore contact" : "Archive contact"}
        message={
          archiveTarget?.archived
            ? `Restore "${archiveTarget?.full_name}"?`
            : `Archive "${archiveTarget?.full_name}"? It will be hidden from lists but its data is kept.`
        }
        confirmLabel={archiveTarget?.archived ? "Restore" : "Archive"}
        danger={!archiveTarget?.archived}
        busy={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
