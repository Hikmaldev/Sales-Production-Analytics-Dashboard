# API Endpoints — Sales / Production Analytics Dashboard

| Item | Detail |
|---|---|
| Document version | 1.0 |
| Date | October 10, 2026 |
| Status | Approved in design review — ready for implementation |
| Companion documents | PRD-Sales-Production-Analytics-Dashboard.md, design-system-analytics-dashboard.md |
| Related artifacts | prisma/schema.prisma, prisma.config.ts, src/shared/schemas/\* |

---

## 1. Conventions

- **Base path:** `/api/v1` (API versioning, PRD §9.5). Paths below are relative to it.
- **Authentication:** `Authorization: Bearer <JWT>` header on every endpoint except `POST /login`, `POST /auth/forgot-password`, and `POST /auth/reset-password`.
- **Role checks** run on the backend for every endpoint (PRD §9.2): `viewer` or `admin`.
- **Dates:** ISO 8601 — `YYYY-MM-DD` for dates, full ISO 8601 UTC for timestamps.
- **Multi-value filters:** `?branch=1&branch=2` or `?branch=1,2`. Omitted or empty means "all".
- **Validation:** Zod v4 schemas in `src/shared/schemas/` (mapped below).
- **Status codes:** `200`/`201` success · `400` validation error · `401` not authenticated · `403` insufficient role · `404` not found · `409` conflict (duplicate email, blocked hard delete) · `500` server error.

### Schema file map

| File | Contents |
|---|---|
| `src/shared/schemas/enums.ts` | `userRoleSchema`, `exportFormatSchema`, `exportStatusSchema` |
| `src/shared/schemas/entities.ts` | entity schemas, `idSchema`, `idParamSchema`, `filterSnapshotSchema` |
| `src/shared/schemas/requests.ts` | request body schemas (login, create user, export, …) |
| `src/shared/schemas/dashboard.ts` | dashboard query-parameter schemas |
| `src/shared/schemas/responses.ts` | response schemas (summary, trend, comparison, sync, lists) |

---

## 2. Action Inventory endpoints (PRD §12)

| Action | Method & path | Access | Input schema | Success result | Failure result |
|---|---|---|---|---|---|
| ACT-01 Login | `POST /login` | Public | `loginRequestSchema` | Token + user (`loginResponseSchema`) | `401` — "Invalid email or password" |
| ACT-02 Date range filter | `GET /dashboard/trend`, `GET /dashboard/branch-comparison`, `GET /dashboard/category-comparison`, `GET /dashboard/summary` (with `start`/`end`) | viewer, admin | `trendQuerySchema`, `branchComparisonQuerySchema`, `categoryComparisonQuerySchema`, `summaryQuerySchema` | All charts and cards update, no manual refresh | Error state on affected charts with retry |
| ACT-03 Branch filter | Same four endpoints with `branch` parameter | viewer, admin | Same query schemas (`branch` multi-value) | Charts and cards update to selected branch(es) | Same as ACT-02 |
| ACT-04 Category filter | Same four endpoints with `category` parameter | viewer, admin | Same query schemas (`category` multi-value) | Charts and cards update to selected category(ies) | Same as ACT-02 |
| ACT-05 Chart tooltip | — (client-side, no endpoint) | viewer, admin | Cached data already on screen | Tooltip shows exact value, date, series | N/A |
| ACT-06 Export PDF | `POST /exports/pdf` | viewer, admin | `exportRequestSchema` | PDF download + `export_logs` row `success` | Error message + `export_logs` row `failed`; user can retry |
| ACT-07 Export Excel | `POST /exports/excel` | viewer, admin | `exportRequestSchema` | Excel download + `export_logs` row `success` | Error message + `export_logs` row `failed`; user can retry |
| ACT-08 Refresh sync | `POST /admin/sync-trigger` | admin | — | Sync starts; status indicator updates (`syncTriggerResponseSchema`) | Error message; status indicator shows "sync failed" |
| ACT-09 Add user | `POST /users` | admin | `createUserRequestSchema` | `201` + created user | `409` duplicate email, shown inline |
| ACT-10 Deactivate | `PATCH /branches/{id}`, `PATCH /product-categories/{id}` | admin | `updateBranchRequestSchema` / `updateCategoryRequestSchema` (`isActive: false`) | Entity hidden from new filter options; historical charts unaffected | `409` when a hard delete is attempted on referenced data — blocked, deactivation suggested |

---

## 3. Supporting endpoints (approved in design review)

| Purpose | Method & path | Access | Notes |
|---|---|---|---|
| Branch filter options | `GET /branches?active=true` | viewer, admin | Feeds the dashboard branch dropdown (FR-FLT-02) |
| Create branch | `POST /branches` | admin | `createBranchRequestSchema`; acceptance criteria §13.4 |
| Category filter options | `GET /product-categories?active=true` | viewer, admin | Feeds the dashboard category dropdown (FR-FLT-03) |
| Create category | `POST /product-categories` | admin | `createCategoryRequestSchema`; acceptance criteria §13.4 |
| User list (Admin) | `GET /users` | admin | `userListResponseSchema`; acceptance criteria §13.4 |
| Export history | `GET /exports/logs` | viewer (own), admin (all) | `exportLogListResponseSchema`; acceptance criteria §13.3 |
| Sync status | `GET /admin/sync-status` | admin | `syncStatusResponseSchema`; polled after ACT-08 |
| Forgot password | `POST /auth/forgot-password` | Public | FR-AUTH-03 |
| Reset password | `POST /auth/reset-password` | Public | FR-AUTH-03 |
| Logout | `POST /logout` | viewer, admin | Optional (JWT stateless); included for completeness |

---

## 4. Notes

- Dashboard aggregation runs in PostgreSQL via Prisma queries or materialized views (PRD §10.5); the frontend never sums raw rows.
- `filter_snapshot` in `export_logs` and the export request body share one shape (`filterSnapshotSchema`): `{ start, end, branches[], categories[] }`. Empty arrays mean all.
- Hard delete is never exposed through the API. Deactivation (`isActive = false`) is the only removal path for branches, categories, and products with historical records.
- IDs are serialized as JSON numbers; the API layer converts BigInt at the database boundary.
- Every export attempt (success or failure) writes one `export_logs` row, so export success rate (PRD §3.2) is measurable.
- Trend metric for MVP is sales value; selectable metrics (e.g. units) are backlog.
