import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listLeads, updateLeadStage } from "../api/leads";
import { PipelineBoard } from "../components/PipelineBoard";
import { ErrorState, LoadingState } from "../components/States";
import { PageHeader } from "../components/ui";
import { useToast } from "../components/Toast";
import { useI18n } from "../i18n";
import type { LeadStage } from "../types";

export default function PipelinePage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const { t } = useI18n();
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["pipeline"],
    queryFn: () => listLeads({ page: 1, page_size: 100, sort_by: "created_at", order: "desc" }),
  });

  const moveMutation = useMutation({
    mutationFn: ({ leadId, stage }: { leadId: string; stage: LeadStage }) =>
      updateLeadStage(leadId, stage),
    onMutate: ({ leadId }) => setBusyLeadId(leadId),
    onSuccess: () => {
      toast.push("success", t("Lead stage updated"));
    },
    onError: (err: Error) => {
      toast.push("error", err.message);
    },
    onSettled: () => {
      setBusyLeadId(null);
      // Always re-fetch: the server is the source of truth for stage changes.
      queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("Sales Pipeline")}
        subtitle={t("Drag a card to move it. Every move is validated and persisted by the API.")}
        actions={
          <Link to="/leads" className="cf-link text-[12.5px]">
            {t("View as list →")}
          </Link>
        }
      />

      {isLoading ? (
        <LoadingState label={t("Loading pipeline…")} />
      ) : isError || !data ? (
        <ErrorState message={error instanceof Error ? error.message : undefined} onRetry={() => refetch()} />
      ) : (
        <PipelineBoard
          leads={data.items}
          busyLeadId={busyLeadId}
          onMoveLead={(leadId, stage) => moveMutation.mutate({ leadId, stage })}
        />
      )}
    </div>
  );
}
