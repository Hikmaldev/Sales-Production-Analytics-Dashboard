# Agent Instructions

## Repository status

- This repository currently contains planning documents only; no application source, package manifest, lockfile, build config, tests, or CI workflows are present.
- There are no verified install, development, lint, typecheck, test, or build commands yet. Do not invent or run assumed commands.

## Project references

- Read `PRD-Sales-Production-Analytics-Dashboard.md` for product scope, API/data-model expectations, roles, acceptance criteria, and testing strategy.
- Read `design-system-analytics-dashboard.md` for the visual rules that are easy to miss: sticky filters, fixed series-color assignment across charts, zero-based Y-axis by default, explicit empty/loading states, and visible data freshness.
- The planned stack is React + TypeScript frontend, Node.js/Express + TypeScript API, PostgreSQL, TanStack Query, and Recharts or Chart.js; treat this as proposed architecture, not evidence that scaffolding exists.

## Non-obvious product constraints

- Dashboard aggregation belongs in PostgreSQL/backend queries, not frontend summation; all charts and summary cards must use the same active filter state.
- Cache keys and exports must include the complete filter combination (date range, branches, and categories); exports must never silently include unfiltered data.
- Branches, categories, and products with historical records are deactivated rather than hard-deleted so historical reporting remains intact.
- MVP authenticated viewers can see all branches; branch-level restriction is a future enhancement unless requirements are explicitly changed.

## ATURAN DASHBOARD

1. Semua angka, grafik, dan tabel dihitung dari query database. Dilarang array contoh di komponen.
2. Filter (tanggal, kategori, dan lainnya) dikirim sebagai parameter ke API. Dilarang memfilter data statis di frontend.
3. Export PDF dan Excel memakai data dan filter yang sama dengan layar. Dilarang memakai data terpisah.
