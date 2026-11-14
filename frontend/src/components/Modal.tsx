import { useEffect } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, Icon } from "./ui";
import { useI18n } from "../i18n";

export function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#10162b]/55 p-4 backdrop-blur-[3px] sm:p-8">
      <div
        className="absolute inset-0"
        aria-hidden="true"
        onClick={onClose}
        data-testid="modal-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`cf-fade relative my-4 w-full ${wide ? "max-w-3xl" : "max-w-lg"} overflow-hidden rounded-2xl bg-white shadow-[0_32px_80px_-24px_rgba(16,22,43,0.55)]`}
      >
        <div className="flex items-center justify-between border-b cf-divider px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-tight text-[#1b2439]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("Close")}
            className="cf-icon-btn"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="flex gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
            danger ? "bg-rose-50 text-rose-500" : "bg-indigo-50 text-indigo-500"
          }`}
        >
          <Icon name={danger ? "alert" : "info"} className="h-4 w-4" />
        </span>
        <p className="pt-1 text-[13.5px] leading-relaxed text-[#59637c]">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          {t("Cancel")}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>
          {busy ? t("Working…") : (confirmLabel ?? t("Confirm"))}
        </Button>
      </div>
    </Modal>
  );
}
