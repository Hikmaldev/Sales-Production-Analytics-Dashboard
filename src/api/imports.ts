import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { ImportRecordResult } from "../shared/schemas/responses";
import { branchKeys } from "./branches";
import { categoryKeys } from "./categories";
import { dashboardKeys } from "./dashboard";
import { API_BASE_URL, ApiError, apiFetch, getAuthToken, saveBlob } from "./client";
import { syncKeys } from "./sync";

export interface ImportRecordsInput {
  file: File;
  createMissing: boolean;
}

/**
 * Option A pipeline: uploads a CSV/XLSX file of sales records. The server
 * validates rows, resolves master data, inserts in batches and logs the run
 * (visible in the sync history). Cache is refreshed so the dashboard and
 * filter options update without a manual reload.
 */
export function useImportRecords() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ file, createMissing }: ImportRecordsInput) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("createMissing", createMissing ? "true" : "false");

      return apiFetch<ImportRecordResult>("/admin/imports/records", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: syncKeys.status });
      void queryClient.invalidateQueries({ queryKey: syncKeys.runs });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
      void queryClient.invalidateQueries({ queryKey: branchKeys.all });
      void queryClient.invalidateQueries({ queryKey: categoryKeys.all });
    },
  });
}

/** Downloads the import template (currently a CSV with example rows). */
export function useImportTemplate() {
  return useMutation({
    mutationFn: async () => {
      const token = getAuthToken();
      const response = await fetch(
        `${API_BASE_URL}/admin/imports/template.csv`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (!response.ok) {
        throw new ApiError(response.status, "Could not download the template.");
      }

      saveBlob(await response.blob(), "import-template.csv");
    },
  });
}
