import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ApiError } from "../api/client";
import { Button, Field, Input } from "../components/ui";

interface LoginValues {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
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
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            CF
          </span>
          <h1 className="text-2xl font-bold text-white">ClientFlow CRM</h1>
          <p className="mt-1 text-sm text-slate-400">Small business CRM with AI-assisted sales workflows</p>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Field label="Email" required error={formState.errors.email?.message}>
              <Input
                {...register("email", { required: "Email is required" })}
                type="email"
                autoComplete="username"
                data-testid="login-email"
              />
            </Field>
            <Field label="Password" required error={formState.errors.password?.message}>
              <Input
                {...register("password", { required: "Password is required" })}
                type="password"
                autoComplete="current-password"
                data-testid="login-password"
              />
            </Field>
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert" data-testid="login-error">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={busy} data-testid="login-submit">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-800 p-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">Demo account (seeded data)</p>
          <p className="mt-1 font-mono">admin@clientflow.dev / Admin123!</p>
          <p className="mt-1 text-slate-400">Demo credentials only - do not reuse anywhere real.</p>
        </div>
      </div>
    </div>
  );
}
