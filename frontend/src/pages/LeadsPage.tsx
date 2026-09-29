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
import { Badge, Button, Input, Select } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { LeadForm } from "../components/forms/LeadForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { formatDate, formatMoney } from "../lib/format";

const PAGE_SIZE = 10;

export default function LeadsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

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
      toast.push("success", editing ? "Lead updated" : "Lead created");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (lead: Lead) => (lead.archived ? unarchiveLead(lead.id) : archiveLead(lead.id)),
    onSuccess: (_data, lead) => {
      invalidate();
      setArchiveTarget(null);
      toast.push("success", lead.archived ? "Lead restored" : "Lead archived");
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
      toast.push("error", err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Leads</h1>
          <p className="text-sm text-slate-500">Opportunities moving through your pipeline.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            data-testid="lead-create"
          >
            New Lead
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by title or description…"
          className="max-w-xs"
          data-testid="lead-search"
        />
        <Select value={stage} onChange={(event) => setStage(event.target.value as LeadStage | "")} className="max-w-40">
          <option value="">All stages</option>
          {LEAD_STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </Select>
        <Select
          value={priority}
          onChange={(event) => setPriority(event.target.value as LeadPriority | "")}
          className="max-w-36"
        >
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingState label="Loading leads…" />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No leads found"
          hint="Create your first lead or adjust the filters."
          action={<Button onClick={() => setFormOpen(true)}>New Lead</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="hidden px-4 py-3 md:table-cell">Close date</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Owner</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((lead) => (
                  <tr key={lead.id} className={lead.archived ? "opacity-60" : undefined}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      <Link to={`/leads/${lead.id}`} className="text-indigo-600 hover:text-indigo-700">
                        {lead.title}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.company?.name ?? "-"}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {formatMoney(lead.value, lead.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={lead.stage} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={lead.priority} />
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                      {formatDate(lead.expected_close_date)}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{lead.owner?.full_name ?? "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/leads/${lead.id}`}
                          className="rounded px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Open
                        </Link>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            setEditing(lead);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          onClick={() => setArchiveTarget(lead)}
                        >
                          Archive
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
        title={editing ? "Edit lead" : "New lead"}
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
        title="Archive lead"
        message={`Archive "${archiveTarget?.title}"? It will be hidden from lists and cannot be moved between stages while archived.`}
        confirmLabel="Archive"
        danger
        busy={archiveMutation.isPending}
        onConfirm={() => archiveTarget && archiveMutation.mutate(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
