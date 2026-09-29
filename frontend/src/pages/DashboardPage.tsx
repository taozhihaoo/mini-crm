import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../api/dashboard";
import { ErrorState, LoadingState } from "../components/States";
import { StatCard } from "../components/StatCard";
import { Badge } from "../components/ui";
import { formatMoney, formatDateTime } from "../lib/format";
import { LEAD_STAGES, STAGE_LABELS } from "../types";
import type { Activity } from "../types";

function ActivityRow({ activity }: { activity: Activity }) {
  const target = activity.lead_id
    ? `/leads/${activity.lead_id}`
    : activity.contact_id
      ? `/contacts`
      : `/companies`;
  return (
    <Link
      to={target}
      className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 rounded-lg px-2 py-2 hover:bg-slate-50"
    >
      <div className="min-w-0 flex-1 basis-36">
        <p className="truncate text-sm font-medium text-slate-800">{activity.subject}</p>
        <p className="truncate text-xs text-slate-500">
          {activity.lead?.title ?? activity.company?.name ?? activity.contact?.full_name ?? "-"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge value={activity.type} />
        <span className="text-xs text-slate-400">{formatDateTime(activity.occurred_at)}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  if (isLoading) return <LoadingState label="Loading dashboard…" />;
  if (isError || !data)
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;

  const maxStageCount = Math.max(1, ...data.pipeline.map((entry) => entry.count));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">Live overview of your sales pipeline and workload.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Companies" value={data.total_companies} />
        <StatCard label="Contacts" value={data.total_contacts} />
        <StatCard label="Open Leads" value={data.open_leads} />
        <StatCard label="Pipeline Value" value={formatMoney(data.pipeline_value)} tone="success" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Won Leads" value={data.won_leads} tone="success" />
        <StatCard label="Lost Leads" value={data.lost_leads} tone="default" />
        <StatCard
          label="Tasks Due Today"
          value={data.tasks_due_today}
          tone={data.tasks_due_today > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Overdue Tasks"
          value={data.tasks_overdue}
          tone={data.tasks_overdue > 0 ? "danger" : "default"}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800">Sales Pipeline</h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {data.pipeline.map((entry) => (
            <div key={entry.stage} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  {STAGE_LABELS[entry.stage]}
                </span>
                <span className="text-sm font-bold text-slate-800">{entry.count}</span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-700">{formatMoney(entry.value)}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${(entry.count / maxStageCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
            Recent Activities
          </h3>
          <div className="divide-y divide-slate-50 px-2 py-1">
            {data.recent_activities.length === 0 && (
              <p className="px-2 py-6 text-center text-sm text-slate-400">No activities logged yet.</p>
            )}
            {data.recent_activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
          <div className="border-t border-slate-100 px-4 py-2 text-right">
            <Link to="/activities" className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
              View all activities →
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          {(
            [
              { title: "Due Today", tasks: data.due_today_tasks, tone: "warning" as const },
              { title: "Overdue", tasks: data.overdue_tasks, tone: "danger" as const },
              { title: "Upcoming", tasks: data.upcoming_tasks, tone: "default" as const },
            ]
          ).map((bucket) => (
            <section key={bucket.title} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <h3 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-800">
                {bucket.title}
              </h3>
              {bucket.tasks.length === 0 ? (
                <p className="px-4 py-4 text-sm text-slate-400">Nothing here.</p>
              ) : (
                <ul className="divide-y divide-slate-50">
                  {bucket.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-2.5"
                    >
                      <span className="min-w-0 flex-1 basis-32 truncate text-sm text-slate-700">
                        {task.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge value={task.priority} />
                        <span className="text-xs text-slate-400">{formatDateTime(task.due_at)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="text-center text-xs text-slate-400">
            {LEAD_STAGES.length} pipeline stages · data refreshed from the live API
          </p>
        </div>
      </div>
    </div>
  );
}
