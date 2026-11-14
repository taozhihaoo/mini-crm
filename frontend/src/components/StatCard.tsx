import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

const TONES = {
  default: { text: "text-[#202a41]", bg: "bg-indigo-50", icon: "text-indigo-500" },
  success: { text: "text-emerald-600", bg: "bg-emerald-50", icon: "text-emerald-500" },
  warning: { text: "text-amber-600", bg: "bg-amber-50", icon: "text-amber-500" },
  danger: { text: "text-rose-600", bg: "bg-rose-50", icon: "text-rose-500" },
} as const;

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  icon = "chart",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: keyof typeof TONES;
  icon?: IconName;
}) {
  const theme = TONES[tone];
  return (
    <div className="cf-kpi cf-card-interactive">
      <div className="flex items-start justify-between gap-3">
        <p className="cf-eyebrow pt-0.5">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${theme.bg} ${theme.icon}`}>
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-3 text-[27px] font-bold leading-none tracking-tight ${theme.text}`} data-testid="stat-value">
        {value}
      </p>
      {hint && <p className="mt-2 text-[11.5px] text-[#98a1b8]">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`cf-card ${className}`}>
      <div className="flex items-center justify-between border-b cf-divider px-4 py-3.5">
        <h3 className="cf-section-title">{title}</h3>
        {action}
      </div>
      <div className="px-4 py-4">{children}</div>
    </div>
  );
}
