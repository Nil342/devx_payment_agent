import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getGetDashboardStatsQueryKey,
  getListDecisionsQueryKey,
  getListInvoicesQueryKey,
  getListMemoryEventsQueryKey,
} from "@workspace/api-client-react";

export type AutopilotStatus = {
  running: boolean;
  lastRunAt: string | null;
  lastError: string | null;
  processedTotal: number;
  currentInvoiceId: number | null;
  mode: string;
  enabled: boolean;
  pendingInvoices: number;
  processingInvoices: number;
};

async function fetchAutopilotStatus(): Promise<AutopilotStatus> {
  const response = await fetch("/api/autopilot/status");
  if (!response.ok) throw new Error("Failed to load autopilot status");
  return response.json();
}

async function runAutopilot(): Promise<AutopilotStatus> {
  const response = await fetch("/api/autopilot/run", { method: "POST" });
  if (!response.ok) throw new Error("Failed to trigger autopilot");
  return response.json();
}

export function useAutopilotStatus() {
  return useQuery({
    queryKey: ["autopilot-status"],
    queryFn: fetchAutopilotStatus,
    refetchInterval: 2_500,
  });
}

export function useRunAutopilot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runAutopilot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["autopilot-status"] });
      queryClient.invalidateQueries({ queryKey: getListInvoicesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardStatsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListDecisionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListMemoryEventsQueryKey() });
    },
  });
}
