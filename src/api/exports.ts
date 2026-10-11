import { useMutation } from "@tanstack/react-query";

import type { FilterSnapshot } from "../shared/schemas/entities";
import type { ExportFormat } from "../shared/schemas/enums";
import { apiDownload, saveBlob } from "./client";

export interface ExportRequestInput {
  format: ExportFormat;
  /** The exact filter combination currently on screen (FR-EXP-03). */
  filters: FilterSnapshot;
}

/**
 * ACT-06/07 — generates the export server-side from the same filters and
 * aggregated data shown on the dashboard, then downloads the file.
 */
export function useRequestExport() {
  return useMutation({
    mutationFn: async ({ format, filters }: ExportRequestInput) => {
      const { blob, filename } = await apiDownload(`/exports/${format}`, {
        filters,
      });
      saveBlob(blob, filename);
      return filename;
    },
  });
}
