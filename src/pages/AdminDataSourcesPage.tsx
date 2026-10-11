import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "../api/dashboard";
import { useImportRecords, useImportTemplate } from "../api/imports";
import {
  syncKeys,
  useSyncRuns,
  useSyncStatus,
  useTriggerSync,
} from "../api/sync";
import { AdminNav } from "../components/AdminNav";
import { EmptyState } from "../components/EmptyState";
import { ErrorState } from "../components/ErrorState";
import { PageHeading } from "../components/PageHeading";
import { TableSkeleton } from "../components/Skeletons";
import { formatDateTime, formatDuration, formatNumber } from "../lib/format";

export function AdminDataSourcesPage() {
  const queryClient = useQueryClient();
  const statusQuery = useSyncStatus();
  const status = statusQuery.data;
  const isSyncing = status?.status === "syncing";

  // Keep the history fresh while a run is in progress.
  const runsQuery = useSyncRuns(isSyncing ? 2000 : false);
  const triggerSync = useTriggerSync();

  const importMutation = useImportRecords();
  const templateMutation = useImportTemplate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [createMissing, setCreateMissing] = useState(false);

  // When a run finishes, refresh the history and the dashboard freshness
  // ("data as of" moves forward).
  const previousStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const wasSyncing = previousStatus.current === "syncing";
    previousStatus.current = status?.status;
    if (wasSyncing && status?.status !== "syncing") {
      void queryClient.invalidateQueries({ queryKey: syncKeys.runs });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    }
  }, [status?.status, queryClient]);

  const lastSyncedLabel = status?.lastSyncedAt
    ? `Last completed ${formatDateTime(status.lastSyncedAt)}`
    : "No sync has completed yet.";
  const statusLabel = isSyncing
    ? "Syncing…"
    : status?.status === "failed"
      ? "Sync failed"
      : status?.lastSyncedAt
        ? "Synced"
        : "Never synced";
  const statusClass = isSyncing
    ? "status-badge is-info"
    : status?.status === "failed"
      ? "status-badge is-error"
      : status?.lastSyncedAt
        ? "status-badge is-active"
        : "status-badge is-inactive";

  function handleImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!importFile) return;

    importMutation.mutate(
      { file: importFile, createMissing },
      {
        onSuccess: () => {
          setImportFile(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      },
    );
  }

  const importResult = importMutation.data;

  return (
    <main className="page-content">
      <PageHeading
        eyebrow="Administration"
        title="Data sources"
        description="Load sales records from a file and monitor the data feeding your dashboard."
      />

      <AdminNav />

      <section className="import-card" aria-labelledby="import-title">
        <div className="import-card-header">
          <div>
            <h2 id="import-title">Import sales records</h2>
            <p>
              Upload a CSV or Excel file. Rows carry an external_ref so
              re-uploading the same file skips duplicates instead of creating
              them twice.
            </p>
          </div>
          <button
            type="button"
            className="text-link"
            disabled={templateMutation.isPending}
            onClick={() => templateMutation.mutate()}
          >
            {templateMutation.isPending ? "Preparing…" : "Download CSV template"}
          </button>
        </div>

        <form className="import-form" onSubmit={handleImport}>
          <label className="import-file-field">
            <span>File (CSV or XLSX, max 4 MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.xlsx"
              onChange={(event) =>
                setImportFile(event.target.files?.[0] ?? null)
              }
            />
          </label>

          <label className="import-checkbox">
            <input
              type="checkbox"
              checked={createMissing}
              onChange={(event) => setCreateMissing(event.target.checked)}
            />
            <span>Create missing branches, categories, and products</span>
          </label>

          <button
            className="button"
            type="submit"
            disabled={!importFile || importMutation.isPending}
          >
            {importMutation.isPending ? "Importing…" : "Import file"}
          </button>
        </form>

        {importMutation.isError ? (
          <p className="inline-note error" role="alert">
            {importMutation.error.message}
          </p>
        ) : null}
        {templateMutation.isError ? (
          <p className="inline-note error" role="alert">
            {templateMutation.error.message}
          </p>
        ) : null}

        {importResult ? (
          <div className="import-result" role="status">
            <p className="inline-note success">
              {`Imported ${formatNumber(importResult.imported)} row(s) · skipped ${formatNumber(importResult.skipped)} already-imported · failed ${formatNumber(importResult.failed)}`}
            </p>
            {importResult.created.branches +
              importResult.created.categories +
              importResult.created.products >
            0 ? (
              <p className="inline-note">
                {`Created ${formatNumber(importResult.created.branches)} branch(es), ${formatNumber(importResult.created.categories)} category(ies), ${formatNumber(importResult.created.products)} product(s).`}
              </p>
            ) : null}
            {importResult.errors.length > 0 ? (
              <ul className="import-errors">
                {importResult.errors.map((rowError) => (
                  <li key={`${rowError.row}-${rowError.message}`}>
                    Row {rowError.row}: {rowError.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="status-card" aria-label="Data sync status">
        <div>
          <h2>Sales records sync</h2>
          <p>{lastSyncedLabel}</p>
        </div>
        <div className="page-actions">
          <span className={statusClass}>{statusLabel}</span>
          <button
            className="button"
            type="button"
            disabled={triggerSync.isPending || isSyncing}
            onClick={() => triggerSync.mutate()}
          >
            {isSyncing ? "Syncing…" : "Refresh sync"}
          </button>
        </div>
      </section>

      {triggerSync.isError ? (
        <p className="inline-note error" role="alert">
          {triggerSync.error.message}
        </p>
      ) : null}

      <section className="table-card" aria-labelledby="sync-history-title">
        <div className="table-card-header">
          <div>
            <h2 id="sync-history-title">Sync history</h2>
            <p>Recent imports and record counts.</p>
          </div>
        </div>

        {runsQuery.isPending ? (
          <TableSkeleton columns={5} />
        ) : runsQuery.isError ? (
          <ErrorState
            message={runsQuery.error?.message}
            onRetry={() => {
              void runsQuery.refetch();
            }}
          />
        ) : (runsQuery.data ?? []).length === 0 ? (
          <EmptyState message="No sync history yet." />
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date and time</th>
                <th>Source</th>
                <th>Records</th>
                <th>Duration</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(runsQuery.data ?? []).map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.startedAt)}</td>
                  <td>{entry.source}</td>
                  <td>{formatNumber(entry.recordCount)}</td>
                  <td>
                    {entry.durationSeconds === null
                      ? "—"
                      : formatDuration(entry.durationSeconds)}
                  </td>
                  <td>
                    <span
                      className={
                        entry.status === "success"
                          ? "status-badge is-active"
                          : entry.status === "failed"
                            ? "status-badge is-error"
                            : "status-badge is-info"
                      }
                    >
                      {entry.status === "success"
                        ? "Success"
                        : entry.status === "failed"
                          ? "Failed"
                          : "Running"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
