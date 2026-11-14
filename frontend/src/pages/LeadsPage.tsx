import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { archiveLead, createLead, listLeads, unarchiveLead, updateLead } from "../api/leads";
import type { LeadPayload } from "../api/leads";
import { listCompanies } from "../api/companies";
import { listContacts } from "../api/contacts";
import { downloadFile } from "../api/client";
import { LEAD_STAGES, PRIORITIES, STAGE_LABELS } from "../types";
import type { Company, Contact, Lead, LeadPriority, LeadStage } from "../types";
import { Badge, Button, Icon, Input, PageHeader, Select } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { LeadForm } from "../components/forms/LeadForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { formatDate, formatMoney } from "../lib/format";
import { useI18n } from "../i18n";

const PAGE_SIZE = 10;

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [stage, setStage] = useState<LeadStage | "">("");
  const [priority, setPriority] = useState<LeadPriority | "">("");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lead | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Lead | null>(null);

  const { data: companiesData } = useQuery({
    queryKey: ["companies", { page: 1, page_size: 100 }],
    queryFn: () => listCompanies({ page: 1, page_size: 100, sort_by: "name", order: "asc" }),
  });
  const companies: Company[] = companiesData?.items ?? [];
  const { data: contactsData } = useQuery({
    queryKey: ["contacts", { page: 1, page_size: 100 }],
    queryFn: () => listContacts({ page: 1, page_size: 100 }),
  });
  const contacts: Contact[] = contactsData?.items ?? [];

  const params = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    stage: stage || undefined,
    priority: priority || undefined,
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["leads", params],
    queryFn: () => listLeads(params),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["leads"] });
    queryClient.invalidateQueries({ queryKey: ["pipeline"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: LeadPayload) => {
      if (editing) return updateLead(editing.id, payload);
      return createLead(payload);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      toast.push("success", editing ? t("Lead updated") : t("Lead created"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (lead: Lead) => (lead.archived ? unarchiveLead(lead.id) : archiveLead(lead.id)),
    onSuccess: (_data, lead) => {
      invalidate();
      setArchiveTarget(null);
      toast.push("success", lead.archived ? t("Lead restored") : t("Lead archived"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, stage, priority]);

  const handleExport = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadFile("/export/leads", `leads_${date}.csv`);
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : t("Export failed"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Leads")}
        subtitle={t("Opportunities moving through your pipeline.")}
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Icon name="download" className="h-4 w-4" />
              {t("Export CSV")}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              data-testid="lead-create"
            >
              <Icon name="plus" className="h-4 w-4" />
              {t("New Lead")}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("Search by title or description…")}
          className="!max-w-xs"
          data-testid="lead-search"
        />
        <Select
          value={stage}
          onChange={(event) => setStage(event.target.value as LeadStage | "")}
          className="!max-w-[170px]"
        >
          <option value="">{t("All stages")}</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {t(STAGE_LABELS[s])}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={(event) => setPriority(event.target.value as LeadPriority | "")}
          className="!max-w-[160px]"
        >
          <option value="">{t("All priorities")}</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {t(p)}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label={t("Loading leads…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t("No leads found")}
          hint={t("Create your first lead or adjust the filters.")}
          action={<Button onClick={() => setFormOpen(true)}>{t("New Lead")}</Button>}
        />
      ) : (
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>{t("Title")}</th>
                  <th>{t("Company")}</th>
                  <th>{t("Value")}</th>
                  <th>{t("Stage")}</th>
                  <th>{t("Priority")}</th>
                  <th className="hidden md:table-cell">{t("Close date")}</th>
                  <th className="hidden lg:table-cell">{t("Owner")}</th>
                  <th className="!text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((lead) => (
                  <tr key={lead.id} className={lead.archived ? "opacity-60" : undefined}>
                    <td>
                      <Link to={`/leads/${lead.id}`} className="cf-link !text-[13px]">
                        {lead.title}
                      </Link>
                    </td>
                    <td>{lead.company?.name ?? "-"}</td>
                    <td className="!font-semibold !text-[#27314a]">{formatMoney(lead.value, lead.currency)}</td>
                    <td>
                      <Badge value={lead.stage} />
                    </td>
                    <td>
                      <Badge value={lead.priority} />
                    </td>
                    <td className="hidden md:table-cell">{formatDate(lead.expected_close_date)}</td>
                    <td className="hidden lg:table-cell">{lead.owner?.full_name ?? "-"}</td>
                    <td className="!text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px]"
                        >
                          {t("Open")}
                        </Link>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-indigo-600"
                          onClick={() => {
                            setEditing(lead);
                            setFormOpen(true);
                          }}
                        >
                          {t("Edit")}
                        </button>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-rose-600"
                          onClick={() => setArchiveTarget(lead)}
                        >
                          {t("Archive")}
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
        title={editing ? t("Edit lead") : t("New lead")}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        wide
      >
        <LeadForm
          companies={companies}
          contacts={contacts}
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
        title={t("Archive lead")}
        message={t('Archive "{title}"? It will be hidden from lists and cannot be moved between stages while archived.', {
          title: archiveTarget?.title ?? "",
        })}
        confirmLabel={t("Archive")}
        danger
        busy={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
