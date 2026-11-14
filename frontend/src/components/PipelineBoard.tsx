import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LEAD_STAGES, STAGE_LABELS } from "../types";
import type { Lead, LeadStage } from "../types";
import { formatMoney } from "../lib/format";
import { Badge } from "./ui";
import { useI18n } from "../i18n";

const STAGE_COLORS: Record<LeadStage, string> = {
  new: "#38bdf8",
  qualified: "#8b5cf6",
  proposal: "#f59e0b",
  negotiation: "#fb923c",
  won: "#10b981",
  lost: "#94a3b8",
};

export function PipelineBoard({
  leads,
  onMoveLead,
  busyLeadId,
}: {
  leads: Lead[];
  onMoveLead: (leadId: string, stage: LeadStage) => void;
  busyLeadId?: string | null;
}) {
  const navigate = useNavigate();
  const { t } = useI18n();

  const handleDrop = (event: DragEvent, stage: LeadStage) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain");
    if (leadId) onMoveLead(leadId, stage);
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" data-testid="pipeline-board">
      {LEAD_STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage);
        const totalValue = stageLeads.reduce((sum, lead) => sum + Number(lead.value), 0);
        const color = STAGE_COLORS[stage];
        return (
          <section
            key={stage}
            aria-label={t("{label} column", { label: t(STAGE_LABELS[stage]) })}
            data-testid={`pipeline-column-${stage}`}
            className="cf-kanban-col flex min-w-[170px] flex-1 flex-col overflow-hidden"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, stage)}
          >
            <header
              className="border-b cf-divider bg-white/80 px-3.5 py-3"
              style={{ borderTop: `3px solid ${color}` }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <h3 className="text-[13px] font-semibold text-[#27314a]">{t(STAGE_LABELS[stage])}</h3>
                </div>
                <span className="rounded-full bg-[#eef1f8] px-2 py-0.5 text-[11px] font-semibold text-[#6b7590]">
                  {stageLeads.length}
                </span>
              </div>
              <p className="mt-1.5 pl-4 text-[12px] font-semibold text-[#7b86a1]" data-testid={`pipeline-value-${stage}`}>
                {formatMoney(totalValue)}
              </p>
            </header>
            <div className="flex min-h-28 flex-1 flex-col gap-2.5 p-2.5">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable={busyLeadId !== lead.id}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", lead.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className={`cf-kanban-card cursor-grab p-3.5 active:cursor-grabbing ${
                    busyLeadId === lead.id ? "opacity-60" : ""
                  }`}
                  style={{ borderLeftColor: color }}
                  data-testid={`pipeline-card-${lead.id}`}
                >
                  <p className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#27314a]">{lead.title}</p>
                  <p className="mt-0.5 truncate text-[11.5px] text-[#98a1b8]">{lead.company?.name}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-[#48526b]">
                      {formatMoney(lead.value, lead.currency)}
                    </span>
                    <Badge value={lead.priority} />
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[#dbe0ec] text-[11.5px] text-[#a3abc0]">
                  {t("Drop leads here")}
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
