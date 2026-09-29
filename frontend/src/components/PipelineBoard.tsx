import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { LEAD_STAGES, STAGE_LABELS } from "../types";
import type { Lead, LeadStage } from "../types";
import { formatMoney } from "../lib/format";
import { Badge } from "./ui";

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

  const handleDrop = (event: DragEvent, stage: LeadStage) => {
    event.preventDefault();
    const leadId = event.dataTransfer.getData("text/plain");
    if (leadId) onMoveLead(leadId, stage);
  };

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4"
      data-testid="pipeline-board"
    >
      {LEAD_STAGES.map((stage) => {
        const stageLeads = leads.filter((lead) => lead.stage === stage);
        const totalValue = stageLeads.reduce((sum, lead) => sum + Number(lead.value), 0);
        return (
          <section
            key={stage}
            aria-label={`${STAGE_LABELS[stage]} column`}
            data-testid={`pipeline-column-${stage}`}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, stage)}
          >
            <header className="rounded-t-xl border-b border-slate-200 bg-white px-3 py-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">{STAGE_LABELS[stage]}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {stageLeads.length}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500" data-testid={`pipeline-value-${stage}`}>
                {formatMoney(totalValue)}
              </p>
            </header>
            <div className="flex min-h-24 flex-1 flex-col gap-2 p-2">
              {stageLeads.map((lead) => (
                <div
                  key={lead.id}
                  draggable={busyLeadId !== lead.id}
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", lead.id);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => navigate(`/leads/${lead.id}`)}
                  className={`cursor-grab rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
                    busyLeadId === lead.id ? "border-indigo-300 opacity-60" : "border-slate-200"
                  }`}
                  data-testid={`pipeline-card-${lead.id}`}
                >
                  <p className="truncate text-sm font-medium text-slate-800">{lead.title}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{lead.company?.name}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {formatMoney(lead.value, lead.currency)}
                    </span>
                    <Badge value={lead.priority} />
                  </div>
                </div>
              ))}
              {stageLeads.length === 0 && (
                <p className="flex flex-1 items-center justify-center text-xs text-slate-400">
                  Drop leads here
                </p>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
