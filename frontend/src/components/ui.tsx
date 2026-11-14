import { forwardRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { Icon } from "./Icon";
import { useI18n } from "../i18n";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary: "cf-btn-primary",
  secondary: "cf-btn-secondary",
  danger: "cf-btn-danger",
  ghost: "cf-btn-ghost",
};

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={`cf-btn ${VARIANTS[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = "", ...props }, ref) {
    return <input ref={ref} className={`cf-input ${className}`} {...props} />;
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className = "", children, ...props }, ref) {
    return (
      <select ref={ref} className={`cf-select ${className}`} {...props}>
        {children}
      </select>
    );
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return <textarea ref={ref} className={`cf-textarea ${className}`} {...props} />;
  },
);

export function Field({
  label,
  error,
  required,
  hint,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold text-[#48526b]">
        {label}
        {required && <span className="ml-0.5 text-rose-500"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11.5px] text-[#98a1b8]">{hint}</p>}
      {error && <p className="text-[11.5px] font-medium text-rose-600">{error}</p>}
    </div>
  );
}

/** Compact pill used for stages, priorities, statuses and roles. */
const BADGE_STYLES: Record<string, string> = {
  new: "bg-sky-50 text-sky-700 ring-sky-200/70",
  qualified: "bg-violet-50 text-violet-700 ring-violet-200/70",
  proposal: "bg-amber-50 text-amber-700 ring-amber-200/70",
  negotiation: "bg-orange-50 text-orange-700 ring-orange-200/70",
  won: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  lost: "bg-slate-100 text-slate-500 ring-slate-200",
  low: "bg-slate-100 text-slate-600 ring-slate-200",
  medium: "bg-amber-50 text-amber-700 ring-amber-200/70",
  high: "bg-rose-50 text-rose-700 ring-rose-200/70",
  open: "bg-sky-50 text-sky-700 ring-sky-200/70",
  completed: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  cancelled: "bg-slate-100 text-slate-500 ring-slate-200",
  note: "bg-slate-100 text-slate-600 ring-slate-200",
  call: "bg-sky-50 text-sky-700 ring-sky-200/70",
  email: "bg-violet-50 text-violet-700 ring-violet-200/70",
  meeting: "bg-amber-50 text-amber-700 ring-amber-200/70",
  admin: "bg-indigo-50 text-indigo-700 ring-indigo-200/70",
  member: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ value, className = "" }: { value: string; className?: string }) {
  const { t } = useI18n();
  const style = BADGE_STYLES[value] ?? "bg-slate-100 text-slate-600 ring-slate-200";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ring-1 ring-inset ${style} ${className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {t(value).replace(/_/g, " ")}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600 ${className}`}
      role="status"
      aria-label={t("Loading")}
    />
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`cf-card ${className}`}>{children}</div>;
}

/** Consistent page title block across all routes. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="cf-page-title">{title}</h1>
        {subtitle && <p className="cf-page-subtitle mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b cf-divider px-4 py-3.5">
      <div className="flex items-center gap-2">
        {icon && <span className="text-indigo-500">{icon}</span>}
        <h3 className="cf-section-title">{title}</h3>
      </div>
      {action}
    </div>
  );
}

export { Icon };
