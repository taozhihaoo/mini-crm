import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, createUser, listAuditLogs, listUsers, updateUser } from "../api/users";
import { useAuth } from "../context/AuthContext";
import type { Role, User } from "../types";
import { Badge, Button, Field, Icon, Input, PageHeader, Select } from "../components/ui";
import { Pagination } from "../components/Pagination";
import { ErrorState, LoadingState } from "../components/States";
import { useToast } from "../components/Toast";
import { formatDateTime } from "../lib/format";
import { useI18n } from "../i18n";

type Tab = "profile" | "users" | "audit";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: "user" | "contact" | "shield"; adminOnly?: boolean }[] = [
    { id: "profile", label: "Profile", icon: "user" },
    { id: "users", label: "Team", icon: "contact", adminOnly: true },
    { id: "audit", label: "Audit Log", icon: "shield", adminOnly: true },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Settings")}
        subtitle={t("Your account, team and system audit trail.")}
      />

      <div className="flex gap-1 border-b cf-divider">
        {tabs
          .filter((entry) => !entry.adminOnly || isAdmin)
          .map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
                tab === entry.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-[#8a94ac] hover:text-[#48526b]"
              }`}
            >
              <Icon name={entry.icon} className="h-4 w-4" />
              {t(entry.label)}
            </button>
          ))}
      </div>

      {tab === "profile" && <ProfilePanel />}
      {tab === "users" && isAdmin && <UsersPanel />}
      {tab === "audit" && isAdmin && <AuditPanel />}
    </div>
  );
}

function ProfilePanel() {
  const { user } = useAuth();
  const toast = useToast();
  const { t } = useI18n();
  const { register, handleSubmit, reset, formState } = useForm<{
    current_password: string;
    new_password: string;
    confirm_password: string;
  }>();

  const mutation = useMutation({
    mutationFn: (values: { current_password: string; new_password: string }) =>
      changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      toast.push("success", t("Password changed"));
      reset();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  return (
    <div className="max-w-md space-y-5">
      <div className="cf-card p-5">
        <h3 className="cf-section-title mb-4">{t("Account")}</h3>
        <dl className="space-y-3 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-[#8a94ac]">{t("Name")}</dt>
            <dd className="font-semibold text-[#303b54]">{user?.full_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#8a94ac]">{t("Email")}</dt>
            <dd className="font-semibold text-[#303b54]">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-[#8a94ac]">{t("Role")}</dt>
            <dd>{user && <Badge value={user.role} />}</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={handleSubmit((values) => {
          if (values.new_password !== values.confirm_password) {
            toast.push("error", t("New passwords do not match"));
            return;
          }
          mutation.mutate(values);
        })}
        className="cf-card p-5"
        noValidate
      >
        <div className="mb-4 flex items-center gap-2">
          <Icon name="lock" className="h-4 w-4 text-indigo-500" />
          <h3 className="cf-section-title">{t("Change password")}</h3>
        </div>
        <div className="space-y-4">
          <Field label={t("Current password")} required error={formState.errors.current_password?.message}>
            <Input
              {...register("current_password", { required: t("Current password is required") })}
              type="password"
              autoComplete="current-password"
            />
          </Field>
          <Field label={t("New password")} required error={formState.errors.new_password?.message}>
            <Input
              {...register("new_password", {
                required: t("New password is required"),
                minLength: { value: 8, message: t("At least 8 characters") },
              })}
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <Field label={t("Confirm new password")} required>
            <Input {...register("confirm_password")} type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? t("Saving…") : t("Change password")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function UsersPanel() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["users", { page, page_size: 10 }],
    queryFn: () => listUsers({ page, page_size: 10 }),
  });

  const { register, handleSubmit, reset, formState } = useForm<{
    email: string;
    full_name: string;
    password: string;
    role: Role;
  }>({ defaultValues: { role: "member" } });

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.push("success", t("Team member added"));
      reset();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { role?: Role; is_active?: boolean } }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.push("success", t("Member updated"));
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {isLoading ? (
          <LoadingState label={t("Loading team…")} />
        ) : isError || !data ? (
          <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
        ) : (
          <div className="cf-card overflow-hidden">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>{t("Member")}</th>
                  <th>{t("Role")}</th>
                  <th>{t("Status")}</th>
                  <th className="!text-right">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((user: User) => (
                  <tr key={user.id}>
                    <td>
                      <p className="font-semibold text-[#303b54]">{user.full_name}</p>
                      <p className="text-[11.5px] text-[#98a1b8]">{user.email}</p>
                    </td>
                    <td>
                      <Badge value={user.role} />
                    </td>
                    <td>
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-emerald-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          {t("Active")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#a3abc0]">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                          {t("Inactive")}
                        </span>
                      )}
                    </td>
                    <td className="!text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-indigo-600"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: user.id,
                              payload: { role: user.role === "admin" ? "member" : "admin" },
                            })
                          }
                        >
                          {user.role === "admin" ? t("Make member") : t("Make admin")}
                        </button>
                        <button
                          type="button"
                          className="cf-btn cf-btn-ghost !px-2 !py-1 !text-[12px] !text-rose-600"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({ id: user.id, payload: { is_active: !user.is_active } })
                          }
                        >
                          {user.is_active ? t("Deactivate") : t("Activate")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit((values) => createMutation.mutate(values))}
        className="cf-card h-fit p-5"
        noValidate
      >
        <h3 className="cf-section-title mb-4">{t("Add team member")}</h3>
        <div className="space-y-4">
          <Field label={t("Full name")} required error={formState.errors.full_name?.message}>
            <Input {...register("full_name", { required: t("Name is required") })} />
          </Field>
          <Field label={t("Email")} required error={formState.errors.email?.message}>
            <Input {...register("email", { required: t("Email is required") })} type="email" />
          </Field>
          <Field label={t("Temporary password")} required error={formState.errors.password?.message}>
            <Input
              {...register("password", {
                required: t("Password is required"),
                minLength: { value: 8, message: t("At least 8 characters") },
              })}
              type="password"
            />
          </Field>
          <Field label={t("Role")}>
            <Select {...register("role")}>
              <option value="member">{t("member")}</option>
              <option value="admin">{t("admin")}</option>
            </Select>
          </Field>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? t("Adding…") : t("Add member")}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AuditPanel() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", { page, page_size: 15, action: action || undefined }],
    queryFn: () => listAuditLogs({ page, page_size: 15, action: action || undefined }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder={t("Filter by action (e.g. lead.stage_changed)…")}
          className="!max-w-sm"
        />
      </div>

      {isLoading ? (
        <LoadingState label={t("Loading audit log…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <div className="cf-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cf-table">
              <thead>
                <tr>
                  <th>{t("When")}</th>
                  <th>{t("User")}</th>
                  <th>{t("Action")}</th>
                  <th>{t("Entity")}</th>
                  <th>{t("Details")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="!whitespace-nowrap !text-[#8a94ac]">{formatDateTime(entry.created_at)}</td>
                    <td className="!font-medium !text-[#48526b]">{entry.user_email ?? t("system")}</td>
                    <td>
                      <code className="rounded-md bg-[#f0f2f8] px-2 py-0.5 font-mono text-[11.5px] text-[#48526b]">
                        {entry.action}
                      </code>
                    </td>
                    <td>
                      {entry.entity_type}
                      {entry.entity_id ? ` (${entry.entity_id.slice(0, 8)}…)` : ""}
                    </td>
                    <td className="!max-w-xs !truncate !font-mono !text-[11px] !text-[#8a94ac]">
                      {entry.metadata ? JSON.stringify(entry.metadata) : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.page_size} total={data.total} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
