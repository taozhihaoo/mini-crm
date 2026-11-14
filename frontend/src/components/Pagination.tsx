import { Icon } from "./Icon";
import { useI18n } from "../i18n";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t cf-divider bg-[#fbfcff] px-4 py-3 text-[12.5px] text-[#6b7590]">
      <span data-testid="pagination-summary">
        {t("Showing {from}–{to} of {total}", { from, to, total })}
      </span>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="cf-btn cf-btn-secondary !px-2.5 !py-1.5 !text-[12px]"
        >
          <Icon name="chevronLeft" className="h-3.5 w-3.5" />
          {t("Previous")}
        </button>
        <span className="font-medium text-[#48526b]">{t("Page {page} of {totalPages}", { page, totalPages })}</span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="cf-btn cf-btn-secondary !px-2.5 !py-1.5 !text-[12px]"
        >
          {t("Next")}
          <Icon name="chevronRight" className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
