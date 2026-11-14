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
import { Button, Icon, Input, PageHeader, Spinner } from "../components/ui";
import { ConfirmDialog, Modal } from "../components/Modal";
import { Pagination } from "../components/Pagination";
import { EmptyState, ErrorState, LoadingState } from "../components/States";
import { CompanyForm } from "../components/forms/CompanyForm";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";
import { useI18n } from "../i18n";

const PAGE_SIZE = 10;

export default function CompaniesPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();
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
      toast.push("success", editing ? t("Company updated") : t("Company created"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const archiveMutation = useMutation({
    mutationFn: (company: Company) =>
      company.archived ? unarchiveCompany(company.id) : archiveCompany(company.id),
    onSuccess: (_data, company) => {
      invalidate();
      setArchiveTarget(null);
      toast.push("success", company.archived ? t("Company restored") : t("Company archived"));
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
        t("Imported {imported}, skipped {skipped}, errors {errors}", {
          imported: summary.imported,
          skipped: summary.skipped,
          errors: summary.errors,
        }),
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
      toast.push("error", err instanceof Error ? err.message : t("Export failed"));
    }
  };

  const handleImportFile = (file: File | undefined) => {
    if (!file) return;
    importMutation.mutate(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Companies")}
        subtitle={t("Track the businesses you sell to.")}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => fileInputRef.current?.click()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? <Spinner /> : <Icon name="upload" className="h-4 w-4" />}
              {t("Import CSV")}
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
              <Icon name="download" className="h-4 w-4" />
              {t("Export CSV")}
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              data-testid="company-create"
            >
              <Icon name="plus" className="h-4 w-4" />
              {t("New Company")}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t("Search by name or email…")}
          className="!max-w-xs"
          data-testid="company-search"
        />
        <Input
          value={industry}
          onChange={(event) => setIndustry(event.target.value)}
          placeholder={t("Filter by industry…")}
          className="!max-w-[190px]"
        />
        <label className="flex cursor-pointer select-none items-center gap-2 text-[12.5px] font-medium text-[#6b7590]">
          <input
            type="checkbox"
            checked={includeArchived}
            onChange={(event) => setIncludeArchived(event.target.checked)}
            className="h-4 w-4 rounded border-[#cbd2e3] accent-indigo-600"
          />
          {t("Show archived")}
        </label>
      </div>

      {importSummary && (
        <div
          className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-[13px] text-indigo-900"
          data-testid="import-summary"
        >
          <p className="font-semibold">
            {t("Imported: {imported} · Skipped: {skipped} · Errors: {errors}", {
              imported: importSummary.imported,
              skipped: importSummary.skipped,
              errors: importSummary.errors,
            })}
          </p>
          {importSummary.error_details.length > 0 && (
            <ul className="mt-2 list-inside list-disc space-y-0.5 text-[12px]">
              {importSummary.error_details.slice(0, 10).map((detail, index) => (
                <li key={index}>
                  {t("Row {row}", { row: detail.row })}
                  {detail.field ? ` (${detail.field})` : ""}: {detail.message}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="mt-2 text-[12px] font-semibold text-indigo-700 underline"
            onClick={() => setImportSummary(null)}
          >
            {t("Dismiss")}
          </button>
        </div>
      )}

      {isLoading ? (
        <LoadingState label={t("Loading companies…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={t("No companies found")}
          hint={t("Create a company or adjust your filters.")}
          action={<Button onClick={() => setFormOpen(true)}>{t("New Company")}</Button>}
        />
      ) : (
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>{t("Name")}</th>
                  <th>{t("Industry")}</th>
                  <th className="hidden md:table-cell">{t("Email")}</th>
                  <th className="hidden lg:table-cell">{t("Phone")}</th>
                  <th>{t("Created")}</th>
                  <th className="!text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((company) => (
                  <tr key={company.id} className={company.archived ? "opacity-60" : undefined}>
                    <td className="!font-semibold !text-[#27314a]">
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-bold text-indigo-600">
                          {company.name.slice(0, 2).toUpperCase()}
                        </span>
                        {company.name}
                        {company.archived && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            {t("Archived")}
                          </span>
                        )}
                      </span>
                    </td>
                    <td>{company.industry ?? "-"}</td>
                    <td className="hidden md:table-cell">{company.email ?? "-"}</td>
                    <td className="hidden lg:table-cell">{company.phone ?? "-"}</td>
                    <td className="!text-[#98a1b8]">{formatDate(company.created_at)}</td>
                    <td className="!text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-indigo-600"
                          onClick={() => {
                            setEditing(company);
                            setFormOpen(true);
                          }}
                        >
                          {t("Edit")}
                        </button>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-rose-600"
                          onClick={() => setArchiveTarget(company)}
                        >
                          {company.archived ? t("Restore") : t("Archive")}
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
        title={editing ? t("Edit company") : t("New company")}
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
        title={archiveTarget?.archived ? t("Restore company") : t("Archive company")}
        message={
          archiveTarget?.archived
            ? t('Restore "{name}" so it appears in lists again?', { name: archiveTarget?.name ?? "" })
            : t('Archive "{name}"? It will be hidden from lists but its data is kept.', {
                name: archiveTarget?.name ?? "",
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
