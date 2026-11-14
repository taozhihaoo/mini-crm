import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getDashboard } from "../api/dashboard";
import { ErrorState, LoadingState } from "../components/States";
import { StatCard } from "../components/StatCard";
import { Badge, Icon, PageHeader, SectionHeader } from "../components/ui";
import { formatMoney, formatDateTime } from "../lib/format";
import { LEAD_STAGES, STAGE_LABELS } from "../types";
import type { Activity } from "../types";
import { useI18n } from "../i18n";

function ActivityRow({ activity }: { activity: Activity }) {
  const target = activity.lead_id
    ? `/leads/${activity.lead_id}`
    : activity.contact_id
      ? `/contacts`
      : `/companies`;
  return (
    <Link
      to={target}
      className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 transition-colors hover:bg-[#f7f8fd]"
    >
      <div className="min-w-0 flex-1 basis-36">
        <p className="truncate text-[13px] font-semibold text-[#303b54]">{activity.subject}</p>
        <p className="truncate text-[11.5px] text-[#98a1b8]">
          {activity.lead?.title ?? activity.company?.name ?? activity.contact?.full_name ?? "-"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2.5">
        <Badge value={activity.type} />
        <span className="text-[11px] whitespace-nowrap text-[#a3abc0]">{formatDateTime(activity.occurred_at)}</span>
      </div>
    </Link>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: getDashboard,
  });

  if (isLoading) return <LoadingState label={t("Loading dashboard…")} />;
  if (isError || !data)
    return <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />;

  const maxStageCount = Math.max(1, ...data.pipeline.map((entry) => entry.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("Dashboard")}
        subtitle={t("Live overview of your sales pipeline and workload.")}
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-[#e5e9f2] bg-white px-3 py-1.5 text-[11.5px] font-medium text-[#6b7590] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("Live data")}

          </span>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("Companies")} value={data.total_companies} icon="building" />
        <StatCard label={t("Contacts")} value={data.total_contacts} icon="contact" />
        <StatCard label={t("Open Leads")} value={data.open_leads} icon="target" />
        <StatCard label={t("Pipeline Value")} value={formatMoney(data.pipeline_value)} tone="success" icon="trending" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("Won Leads")} value={data.won_leads} tone="success" icon="check" />
        <StatCard label={t("Lost Leads")} value={data.lost_leads} icon="x" />
        <StatCard
          label={t("Tasks Due Today")}
          value={data.tasks_due_today}
          tone={data.tasks_due_today > 0 ? "warning" : "default"}
          icon="calendar"
        />
        <StatCard
          label={t("Overdue Tasks")}
          value={data.tasks_overdue}
          tone={data.tasks_overdue > 0 ? "danger" : "default"}
          icon="clock"
        />
      </div>

      <section className="cf-card overflow-hidden">
        <SectionHeader
          title={t("Sales Pipeline")}
          icon={<Icon name="chart" className="h-4 w-4" />}
          action={
            <Link to="/pipeline" className="cf-link text-[12px]">
              {t("Open pipeline →")}
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
          {data.pipeline.map((entry) => (
            <div
              key={entry.stage}
              className="rounded-xl border border-[#e9ecf5] bg-gradient-to-b from-white to-[#fafbff] p-3.5"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[11.5px] font-semibold text-[#6b7590]">
                  {t(STAGE_LABELS[entry.stage])}
                </span>
                <span className="text-[15px] font-bold tracking-tight text-[#202a41]">{entry.count}</span>
              </div>
              <p className="mt-1.5 text-[12.5px] font-semibold text-[#48526b]">{formatMoney(entry.value)}</p>
              <div className="cf-progress mt-3">
                <div
                  className="cf-progress-bar"
                  style={{ width: `${(entry.count / maxStageCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="cf-card overflow-hidden">
          <SectionHeader
            title={t("Recent Activities")}
            icon={<Icon name="activity" className="h-4 w-4" />}
          />
          <div className="divide-y divide-[#f0f2f8] px-2 py-1.5">
            {data.recent_activities.length === 0 && (
              <p className="px-3 py-8 text-center text-[13px] text-[#a3abc0]">{t("No activities logged yet.")}</p>
            )}
            {data.recent_activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
          <div className="border-t cf-divider px-4 py-2.5 text-right">
            <Link to="/activities" className="cf-link text-[12px]">
              {t("View all activities →")}
            </Link>
          </div>
        </section>

        <div className="space-y-4">
          {(
            [
              { title: "Due Today", tasks: data.due_today_tasks, tone: "warning" as const, icon: "calendar" as const },
              { title: "Overdue", tasks: data.overdue_tasks, tone: "danger" as const, icon: "alert" as const },
              { title: "Upcoming", tasks: data.upcoming_tasks, tone: "default" as const, icon: "clock" as const },
            ]
          ).map((bucket) => (
            <section key={bucket.title} className="cf-card overflow-hidden">
              <SectionHeader
                title={t(bucket.title)}
                icon={<Icon name={bucket.icon} className="h-4 w-4" />}
              />
              {bucket.tasks.length === 0 ? (
                <p className="px-4 py-5 text-[13px] text-[#a3abc0]">{t("Nothing here.")}</p>
              ) : (
                <ul className="divide-y divide-[#f0f2f8]">
                  {bucket.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3"
                    >
                      <span className="min-w-0 flex-1 basis-32 truncate text-[13px] font-medium text-[#48526b]">
                        {task.title}
                      </span>
                      <div className="flex shrink-0 items-center gap-2.5">
                        <Badge value={task.priority} />
                        <span className="text-[11px] whitespace-nowrap text-[#a3abc0]">
                          {formatDateTime(task.due_at)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <p className="text-center text-[11.5px] text-[#a3abc0]">
            {t("{n} pipeline stages · data refreshed from the live API", { n: LEAD_STAGES.length })}
          </p>
        </div>
      </div>
    </div>
  );
}
