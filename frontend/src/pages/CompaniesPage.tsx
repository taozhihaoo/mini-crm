import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveCompany,
  createCompany,
  importCompanies,
  listCompanies,
  unarchiveCompany,
  updateCompany,
} from "../api/companies";
import type { CompanyPayload } from "../api/companies";
import { downloadFile } from "../api/client";
import type { Company, ImportSummary } from "../types";
import { Button, Input, Spinner } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { CompanyForm } from "../components/forms/CompanyForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [industry, setIndustry] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Company | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);

  const params = {
    page,
    page_size: PAGE_SIZE,
    search: search || undefined,
    industry: industry || undefined,
    include_archived: includeArchived || undefined,
  };
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["companies", params, includeArchived],
    queryFn: () => listCompanies(params),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: CompanyPayload) => {
      if (editing) return updateCompany(editing.id, payload);
      return createCompany(payload);
    },
    onSuccess: () => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      toast.push("success", editing ? "Company updated" : "Company created");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (company: Company) =>
      company.archived ? unarchiveCompany(company.id) : archiveCompany(company.id),
    onSuccess: (_data, company) => {
      invalidate();
      setArchiveTarget(null);
      toast.push("success", company.archived ? "Company restored" : "Company archived");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const importMutation = useMutation({
    mutationFn: (file: File) => importCompanies(file),
    onSuccess: (summary) => {
      invalidate();
      setImportSummary(summary);
      toast.push(
        summary.errors > 0 ? "info" : "success",
        `Imported ${summary.imported}, skipped ${summary.skipped}, errors ${summary.errors}`,
      );
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  useEffect(() => {
    setPage(1);
  }, [search, industry]);

  const handleExport = async () => {
    try {
      const date = new Date().toISOString().slice(0, 10);
      await downloadFile("/export/companies", `companies_${date}.csv`);
    } catch (err) {
      toast.push("error", err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    importMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500">Track the businesses you sell to.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}>
            {importMutation.isPending ? <Spinner className="mr-1" /> : null} Import CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => handleImportFile(event.target.files?.[0])}
            data-testid="company-import-input"
          />
          <Button variant="secondary" onClick={handleExport}>
            Export CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            data-testid="company-create"
          >
            New Company
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search by name or email…"
          className="max-w-xs"
          data-testid="company-search"
        />
        <Input
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          placeholder="Filter by industry…"
          className="max-w-44"
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {importSummary && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900" data-testid="import-summary">
          <p className="font-semibold">
            Imported: {importSummary.imported} · Skipped: {importSummary.skipped} · Errors:{" "}
            {importSummary.errors}
          </p>
          {importSummary.error_details.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-xs">
              {importSummary.error_details.slice(0, 10).map((detail, index) => (
                <li key={index}>
                  Row {detail.row}
                  {detail.field ? ` (${detail.field})` : ""}: {detail.message}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-2 text-xs font-medium text-sky-700 underline"
            onClick={() => setImportSummary(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Loading companies…" />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No companies found"
          hint="Create a company or adjust your filters."
          action={<Button onClick={() => setFormOpen(true)}>New Company</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="hidden px-4 py-3 md:table-cell">Email</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Phone</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((company) => (
                  <tr key={company.id} className={company.archived ? "opacity-60" : undefined}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {company.name}
                      {company.archived && (
                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                          Archived
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{company.industry ?? "-"}</td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{company.email ?? "-"}</td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{company.phone ?? "-"}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(company.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            setEditing(company);
                            setFormOpen(true);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          onClick={() => setArchiveTarget(company)}
                        >
                          {company.archived ? "Restore" : "Archive"}
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
        title={editing ? "Edit company" : "New company"}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        wide
      >
        <CompanyForm
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
        title={archiveTarget?.archived ? "Restore company" : "Archive company"}
        message={
          archiveTarget?.archived
            ? `Restore "${archiveTarget?.name}" so it appears in lists again?`
            : `Archive "${archiveTarget?.name}"? It will be hidden from lists but its data is kept.`
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
