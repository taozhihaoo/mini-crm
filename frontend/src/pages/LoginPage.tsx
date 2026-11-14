import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Button, Field, Icon, Input } from "../components/ui";
import { useI18n } from "../i18n";

interface LoginValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useI18n();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState } = useForm<LoginValues>();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = async (values: LoginValues) => {
    setError(null);
    setBusy(true);
    try {
      await login(values.email, values.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("Login failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white">
      {/* Brand panel */}
      <div className="cf-gradient-login relative hidden w-[46%] flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-6 top-4 h-[300px] w-[300px] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -bottom-32 -left-20 h-[380px] w-[380px] rounded-full bg-white/[0.04] blur-2xl" />

        <div className="relative flex items-center gap-3">
          <span className="cf-logo-mark h-10 w-10 text-[14px]">CF</span>
          <span className="text-[17px] font-bold tracking-tight text-white">ClientFlow CRM</span>
        </div>

        <div className="relative max-w-md">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-medium text-indigo-100 backdrop-blur">
            <Icon name="sparkles" className="h-3.5 w-3.5" />
            {t("Trusted by small sales teams")}
          </div>
          <h2 className="text-[38px] font-bold leading-[1.15] tracking-[-0.04em] text-white">
            {t("Manage your pipeline, customers and follow-ups in one place.")}
          </h2>
          <p className="mt-5 text-[14px] leading-relaxed text-indigo-200/80">
            {t("Small business CRM with AI-assisted sales workflows")}
          </p>

          <div className="mt-10 space-y-3">
            {[
              { icon: "kanban" as const, label: "Sales Pipeline" },
              { icon: "sparkles" as const, label: "AI Assistance" },
              { icon: "shield" as const, label: "Audit Log" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-[13px] text-indigo-100/90">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/10">
                  <Icon name={item.icon} className="h-4 w-4" />
                </span>
                {t(item.label)}
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-indigo-200/50">© ClientFlow CRM · MIT License</p>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col">
        <div className="flex justify-end p-6">
          <button
            type="button"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            className="flex items-center gap-1.5 rounded-lg border border-[#e2e6f0] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#59637c] transition-colors hover:border-indigo-300 hover:text-indigo-600"
          >
            <Icon name="globe" className="h-3.5 w-3.5" />
            {lang === "en" ? "EN" : "中"}
          </button>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <div className="w-full max-w-[380px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="cf-logo-mark h-10 w-10 text-[14px]">CF</span>
              <span className="text-[17px] font-bold tracking-tight text-[#1b2439]">ClientFlow CRM</span>
            </div>

            <h1 className="text-[27px] font-bold tracking-[-0.035em] text-[#1b2439]">
              {t("Welcome back")}
            </h1>
            <p className="mt-2 text-[13.5px] text-[#7b86a1]">{t("Sign in to your workspace")}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5" noValidate>
              <Field label={t("Email")} required error={formState.errors.email?.message}>
                <Input
                  {...register("email", { required: t("Email is required") })}
                  type="email"
                  autoComplete="username"
                  placeholder="name@company.com"
                  data-testid="login-email"
                />
              </Field>
              <Field label={t("Password")} required error={formState.errors.password?.message}>
                <Input
                  {...register("password", { required: t("Password is required") })}
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  data-testid="login-password"
                />
              </Field>
              {error && (
                <p
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12.5px] font-medium text-rose-700"
                  role="alert"
                  data-testid="login-error"
                >
                  <Icon name="alert" className="h-4 w-4 shrink-0" />
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full !py-2.5" disabled={busy} data-testid="login-submit">
                {busy ? (
                  t("Signing in…")
                ) : (
                  <>
                    {t("Sign in")}
                    <Icon name="arrowRight" className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 rounded-2xl border border-[#e5e9f2] bg-[#f8f9fd] p-4">
              <div className="flex items-center gap-2 text-[12px] font-semibold text-[#48526b]">
                <Icon name="info" className="h-3.5 w-3.5 text-indigo-500" />
                {t("Demo account (seeded data)")}
              </div>
              <p className="mt-2 font-mono text-[12px] text-[#3d4761]">admin@clientflow.dev / Admin123!</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-[#98a1b8]">
                {t("Demo credentials only - do not reuse anywhere real.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
