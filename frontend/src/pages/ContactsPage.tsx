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
import { Button, Icon, Input, PageHeader, Select } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { ContactForm } from "../components/forms/ContactForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { useI18n } from "../i18n";

const PAGE_SIZE = 10;

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

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
      toast.push("success", editing ? t("Contact updated") : t("Contact created"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (contact: Contact) =>
      contact.archived ? unarchiveContact(contact.id) : archiveContact(contact.id),
    onSuccess: (_data, contact) => {
      invalidate();
      setArchiveTarget(null);
      toast.push("success", contact.archived ? t("Contact restored") : t("Contact archived"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, companyId]);

  const companyName = (id: string) => companies.find((company) => company.id === id)?.name ?? "-";

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Contacts")}
        subtitle={t("People you work with at each company.")}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            data-testid="contact-create"
          >
            <Icon name="plus" className="h-4 w-4" />
            {t("New Contact")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("Search by name or email…")}
          className="!max-w-xs"
          data-testid="contact-search"
        />
        <Select
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          className="!max-w-[220px]"
        >
          <option value="">{t("All companies")}</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label={t("Loading contacts…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t("No contacts found")}
          hint={t("Create a contact or adjust your filters.")}
          action={<Button onClick={() => setFormOpen(true)}>{t("New Contact")}</Button>}
        />
      ) : (
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>{t("Name")}</th>
                  <th>{t("Company")}</th>
                  <th className="hidden md:table-cell">{t("Email")}</th>
                  <th className="hidden md:table-cell">{t("Job title")}</th>
                  <th className="hidden lg:table-cell">{t("Phone")}</th>
                  <th className="!text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((contact) => (
                  <tr key={contact.id} className={contact.archived ? "opacity-60" : undefined}>
                    <td className="!font-semibold !text-[#27314a]">
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-indigo-200 text-[11px] font-bold text-indigo-700">
                          {(contact.first_name[0] ?? "") + (contact.last_name[0] ?? "")}
                        </span>
                        {contact.full_name}
                      </span>
                    </td>
                    <td>
                      <Link to="/companies" className="cf-link !text-[13px]">
                        {companyName(contact.company_id)}
                      </Link>
                    </td>
                    <td className="hidden md:table-cell">{contact.email}</td>
                    <td className="hidden md:table-cell">{contact.job_title ?? "-"}</td>
                    <td className="hidden lg:table-cell">{contact.phone ?? "-"}</td>
                    <td className="!text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-indigo-600"
                          onClick={() => {
                            setEditing(contact);
                            setFormOpen(true);
                          }}
                        >
                          {t("Edit")}
                        </button>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-rose-600"
                          onClick={() => setArchiveTarget(contact)}
                        >
                          {contact.archived ? t("Restore") : t("Archive")}
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
        title={editing ? t("Edit contact") : t("New contact")}
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
        title={archiveTarget?.archived ? t("Restore contact") : t("Archive contact")}
        message={
          archiveTarget?.archived
            ? t('Restore "{name}"?', { name: archiveTarget?.full_name ?? "" })
            : t('Archive "{name}"? It will be hidden from lists but its data is kept.', {
                name: archiveTarget?.full_name ?? "",
              })
        }
        confirmLabel={archiveTarget?.archived ? t("Restore") : t("Archive")}
        danger={!archiveTarget?.archived}
        busy={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
