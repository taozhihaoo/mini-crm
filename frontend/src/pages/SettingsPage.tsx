import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { changePassword, createUser, listAuditLogs, listUsers, updateUser } from "../api/users";
import { useAuth } from "../context/AuthContext";
import type { Role, User } from "../types";
import { Badge, Button, Field, Input, Select } from "../components/ui";
import { Pagination } from "../components/Pagination";
import { ErrorState, LoadingState } from "../components/States";
import { useToast } from "../components/Toast";
import { formatDateTime } from "../lib/format";

type Tab = "profile" | "users" | "audit";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; adminOnly?: boolean }[] = [
    { id: "profile", label: "Profile" },
    { id: "users", label: "Team", adminOnly: true },
    { id: "audit", label: "Audit Log", adminOnly: true },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Your account, team and system audit trail.</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs
          .filter((entry) => !entry.adminOnly || isAdmin)
          .map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === entry.id
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {entry.label}
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
  const { register, handleSubmit, reset, formState } = useForm<{
    current_password: string;
    new_password: string;
    confirm_password: string;
  }>();

  const mutation = useMutation({
    mutationFn: (values: { current_password: string; new_password: string }) =>
      changePassword(values.current_password, values.new_password),
    onSuccess: () => {
      toast.push("success", "Password changed");
      reset();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  return (
    <div className="max-w-md space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Account</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium text-slate-800">{user?.full_name}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium text-slate-800">{user?.email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd>{user && <Badge value={user.role} />}</dd>
          </div>
        </dl>
      </div>

      <form
        onSubmit={handleSubmit((values) => {
          if (values.new_password !== values.confirm_password) {
            toast.push("error", "New passwords do not match");
            return;
          }
          mutation.mutate(values);
        })}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        noValidate
      >
        <h3 className="text-sm font-semibold text-slate-800">Change password</h3>
        <div className="mt-3 space-y-3">
          <Field label="Current password" required error={formState.errors.current_password?.message}>
            <Input
              {...register("current_password", { required: "Current password is required" })}
              type="password"
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password" required error={formState.errors.new_password?.message}>
            <Input
              {...register("new_password", {
                required: "New password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
              type="password"
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password" required>
            <Input {...register("confirm_password")} type="password" autoComplete="new-password" />
          </Field>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving…" : "Change password"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function UsersPanel() {
  const queryClient = useQueryClient();
  const toast = useToast();
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
      toast.push("success", "Team member added");
      reset();
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { role?: Role; is_active?: boolean } }) =>
      updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.push("success", "Member updated");
    },
    onError: (err: Error) => toast.push("error", err.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {isLoading ? (
          <LoadingState label="Loading team…" />
        ) : isError || !data ? (
          <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((user: User) => (
                  <tr key={user.id}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{user.full_name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge value={user.role} />
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="text-xs font-medium text-emerald-600">Active</span>
                      ) : (
                        <span className="text-xs font-medium text-slate-400">Inactive</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({
                              id: user.id,
                              payload: { role: user.role === "admin" ? "member" : "admin" },
                            })
                          }
                        >
                          {user.role === "admin" ? "Make member" : "Make admin"}
                        </button>
                        <button
                          type="button"
                          className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          disabled={updateMutation.isPending}
                          onClick={() =>
                            updateMutation.mutate({ id: user.id, payload: { is_active: !user.is_active } })
                          }
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
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
        className="h-fit rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        noValidate
      >
        <h3 className="text-sm font-semibold text-slate-800">Add team member</h3>
        <div className="mt-3 space-y-3">
          <Field label="Full name" required error={formState.errors.full_name?.message}>
            <Input {...register("full_name", { required: "Name is required" })} />
          </Field>
          <Field label="Email" required error={formState.errors.email?.message}>
            <Input
              {...register("email", { required: "Email is required" })}
              type="email"
            />
          </Field>
          <Field label="Temporary password" required error={formState.errors.password?.message}>
            <Input
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
              type="password"
            />
          </Field>
          <Field label="Role">
            <Select {...register("role")}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </Select>
          </Field>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Adding…" : "Add member"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function AuditPanel() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", { page, page_size: 15, action: action || undefined }],
    queryFn: () => listAuditLogs({ page, page_size: 15, action: action || undefined }),
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Input
          value={action}
          onChange={(event) => setAction(event.target.value)}
          placeholder="Filter by action (e.g. lead.stage_changed)…"
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <LoadingState label="Loading audit log…" />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">When</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.items.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500">
                      {formatDateTime(entry.created_at)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{entry.user_email ?? "system"}</td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700">
                        {entry.action}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">
                      {entry.entity_type}
                      {entry.entity_id ? ` (${entry.entity_id.slice(0, 8)}…)` : ""}
                    </td>
                    <td className="max-w-xs truncate px-4 py-2.5 font-mono text-xs text-slate-500">
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
