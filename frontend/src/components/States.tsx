import { Button, Icon } from "./ui";
import { useI18n } from "../i18n";

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-[13px] text-[#7b86a1]">
      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-indigo-100 border-t-indigo-600" />
      {label ?? t("Loading…")}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="cf-card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
        <Icon name="alert" className="h-6 w-6" />
      </span>
      <p className="text-[14px] font-semibold text-[#27314a]">{t("Something went wrong")}</p>
      <p className="max-w-md text-[13px] text-[#7b86a1]">{message ?? t("Please try again.")}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry} className="mt-1">
          <Icon name="refresh" className="h-4 w-4" />
          {t("Try again")}
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="cf-card flex flex-col items-center gap-3 px-6 py-16 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-100 text-indigo-400">
        <Icon name="layers" className="h-7 w-7" />
        <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-white shadow-sm" />
      </span>
      <p className="text-[14px] font-semibold text-[#27314a]">{title}</p>
      {hint && <p className="max-w-md text-[13px] text-[#7b86a1]">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-4" aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="h-10 animate-pulse rounded-lg bg-[#f0f2f8]" />
      ))}
    </div>
  );
}
