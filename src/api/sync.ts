import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SyncRunListResponse,
  SyncStatusResponse,
  SyncTriggerResponse,
} from "../shared/schemas/responses";
import { apiFetch } from "./client";
import { dashboardKeys } from "./dashboard";

export const syncKeys = {
  status: ["sync", "status"] as const,
  runs: ["sync", "runs"] as const,
};

/** Polls every 2s while a run is in progress so the badge flips to Synced. */
export function useSyncStatus() {
  return useQuery({
    queryKey: syncKeys.status,
    queryFn: () => apiFetch<SyncStatusResponse>("/admin/sync-status"),
    refetchInterval: (query) =>
      query.state.data?.status === "syncing" ? 2000 : false,
  });
}

export function useSyncRuns(refetchInterval: number | false = false) {
  return useQuery({
    queryKey: syncKeys.runs,
    queryFn: () => apiFetch<SyncRunListResponse>("/admin/sync-runs"),
    refetchInterval,
  });
}

/** ACT-08 — manual refresh; the UI polls the status endpoint afterwards. */
export function useTriggerSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<SyncTriggerResponse>("/admin/sync-trigger", { method: "POST" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: syncKeys.status });
      void queryClient.invalidateQueries({ queryKey: syncKeys.runs });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
