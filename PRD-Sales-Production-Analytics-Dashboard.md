# Product Requirements Document (PRD)

## Sales / Production Analytics Dashboard

| Item | Detail |
|---|---|
| Document version | 1.0 (Draft) |
| Date | October 9, 2026 |
| Status | Draft for review |
| Tech stack | React, TypeScript, Recharts or Chart.js, Node.js/Express, PostgreSQL |

---

## 1. Product Summary

This dashboard turns raw sales or production tables into charts a manager can read in seconds. Instead of scrolling through rows of numbers, a manager picks a date range, branch, or product category, and sees the trend immediately. Reports that used to require someone to build a pivot table in Excel are now one click away, and can be exported to PDF or Excel when needed for a meeting.

## 2. Background and Problem

Most companies already collect sales or production data, but the reporting that comes out of it is a raw table:

- A manager has to scroll through hundreds of rows to spot a trend.
- Comparing two branches means manually building a pivot table every time.
- There is no quick way to answer "how are we trending this month" without asking someone to pull a report.
- Reports are usually static, generated once and emailed, not something a manager can explore themselves.
- Filtering by date, branch, or product category means a new export request each time.

## 3. Goals and Success Metrics

### 3.1 Goals

1. Let a manager see sales or production trends visually, not as a raw table.
2. Let a manager filter by date range, branch, and product category without needing a new report built for them.
3. Make branch and category comparisons a normal part of browsing the dashboard, not a special request.
4. Let a manager export what they're looking at to PDF or Excel for meetings and offline use.
5. Keep the dashboard fast and responsive even as the underlying dataset grows.

### 3.2 Success Metrics

| Metric | Target | How to measure |
|---|---|---|
| Time to answer "how is branch X trending this month" | Under 30 seconds | User testing with a manager |
| Ad hoc report requests to IT/analyst team | Reduced significantly after rollout | Compare request volume before and after |
| Dashboard page load time | Under 2 seconds for a typical date range | Performance monitoring |
| Export success rate (PDF/Excel) | 99%+ | Export error log |
| Managers using the dashboard weekly | Majority of target managers within 1 month | Usage/session log |

## 4. Scope

### 4.1 In Scope (MVP)

- Interactive dashboard with filters for date range, branch, and product category.
- Line chart showing trends over time (e.g. daily or monthly sales/production volume).
- Bar chart comparing branches or categories side by side.
- Summary cards for key totals (e.g. total sales, total units produced) for the selected filter set.
- Export the current filtered view to PDF.
- Export the current filtered view's underlying data to Excel.
- Data fetching and caching handled through React Query, so switching filters feels instant on repeated views.

### 4.2 Out of Scope for MVP

- Predictive analytics or forecasting.
- Custom dashboard builder (drag-and-drop widgets, user-defined chart types).
- Real-time streaming updates (the dashboard reflects data as of the last sync, not live-updating every second).
- Role-based data restriction beyond a basic viewer/admin split (e.g. a branch manager only seeing their own branch) is a stretch goal, not a hard MVP requirement unless confirmed necessary.
- Mobile native app. Responsive web is enough for MVP.

## 5. Target Users

### 5.1 Persona

**Branch or Regional Manager**
- Wants a fast read on how their branch or region is doing, without asking an analyst.
- Compares their branch against others.
- Needs to export a chart or table for a weekly or monthly review meeting.

**Operations / Production Manager**
- Tracks production volume trends over time, by category or line.
- Needs to spot a dip or spike quickly, not after the fact.

**Executive / Owner (secondary user)**
- Wants a company-wide view across all branches and categories.
- Mostly consumes summary cards and top-level trend charts rather than drilling into detail.

**Analyst / Admin (secondary user)**
- Maintains the underlying data pipeline.
- May need to verify that dashboard numbers match the source data.

## 6. Roles and Access

| Feature | Viewer (Manager) | Admin |
|---|---|---|
| View dashboard and charts | Yes | Yes |
| Filter by date, branch, category | Yes | Yes |
| Export to PDF/Excel | Yes | Yes |
| View all branches | Yes (MVP default) | Yes |
| Manage data sources / sync settings | No | Yes |
| Manage user accounts | No | Yes |

**Note:** MVP treats all authenticated viewers as able to see all branches and categories. Restricting a manager to only their own branch's data is listed as a future enhancement (see section 19), pending confirmation of whether that restriction is actually required for this rollout.

## 7. Functional Requirements

### 7.1 Authentication

| ID | Requirement | Priority |
|---|---|---|
| FR-AUTH-01 | User logs in with email and password before accessing the dashboard. | Must |
| FR-AUTH-02 | System distinguishes viewer and admin roles. | Must |
| FR-AUTH-03 | User can reset password via email. | Should |

### 7.2 Filters

| ID | Requirement | Priority |
|---|---|---|
| FR-FLT-01 | User can filter the dashboard by a date range (start and end date). | Must |
| FR-FLT-02 | User can filter by one or more branches. | Must |
| FR-FLT-03 | User can filter by one or more product categories. | Must |
| FR-FLT-04 | Filters apply to every chart and summary card on the dashboard simultaneously. | Must |
| FR-FLT-05 | System provides quick date range presets (e.g. Last 7 Days, This Month, Last Month, This Year). | Should |
| FR-FLT-06 | Selected filters persist when the user navigates away and returns to the dashboard within the same session. | Should |

### 7.3 Charts and Visualization

| ID | Requirement | Priority |
|---|---|---|
| FR-CHT-01 | System shows a line chart of the selected metric (e.g. sales value, units produced) over time, based on the current filters. | Must |
| FR-CHT-02 | System shows a bar chart comparing branches for the current filter set. | Must |
| FR-CHT-03 | System shows a bar chart comparing product categories for the current filter set. | Should |
| FR-CHT-04 | Summary cards show key totals (e.g. total sales, total units, period-over-period change) for the current filter set. | Must |
| FR-CHT-05 | Hovering or tapping a data point on a chart shows the exact value and date/branch/category it represents. | Must |
| FR-CHT-06 | Charts show a clear empty state when the current filter combination returns no data, instead of a blank or broken chart. | Must |

### 7.4 Export

| ID | Requirement | Priority |
|---|---|---|
| FR-EXP-01 | User can export the current dashboard view (charts and summary) as a PDF. | Must |
| FR-EXP-02 | User can export the underlying filtered data as an Excel file. | Must |
| FR-EXP-03 | Exported files reflect the filters active at the time of export, clearly labeled with the date range and filter criteria used. | Must |
| FR-EXP-04 | Export action shows a loading indicator and does not block the rest of the dashboard while generating. | Should |

### 7.5 Data Fetching and Performance

| ID | Requirement | Priority |
|---|---|---|
| FR-DAT-01 | Dashboard data is fetched through a RESTful API backed by Node.js/Express and PostgreSQL. | Must |
| FR-DAT-02 | Frontend uses React Query to cache fetched data per filter combination, avoiding redundant requests when a user switches back to a previously viewed filter set. | Must |
| FR-DAT-03 | System shows a loading state while data is being fetched, and an error state with a retry option if the fetch fails. | Must |
| FR-DAT-04 | Aggregation (totals, trend grouping) happens on the backend/database, not by pulling raw rows to the frontend and summing them in the browser. | Must |

## 8. Main User Flows

### 8.1 Explore a Trend

1. Manager logs in and lands on the dashboard with a default filter (e.g. current month, all branches).
2. Manager adjusts the date range to the last quarter.
3. Dashboard updates the line chart, bar chart, and summary cards to reflect the new range.
4. Manager hovers over a spike in the line chart to see the exact value and date.
5. Manager narrows the filter to one branch to investigate further.

### 8.2 Export for a Meeting

1. Manager sets filters for the specific period and branches they want to report on.
2. Manager clicks "Export to PDF."
3. System generates a PDF reflecting the current charts and filter labels.
4. Manager downloads the file and brings it to the meeting.

## 9. Non-Functional Requirements

### 9.1 Performance

- Dashboard initial load completes within 2 seconds for a typical default filter (e.g. current month, all branches).
- Switching filters that have been viewed before in the session returns from cache via React Query, with no visible loading delay.
- Backend aggregation queries are indexed appropriately so a full-year trend query returns within 1 to 2 seconds even as data grows.

### 9.2 Security

- All traffic runs over HTTPS.
- Passwords are hashed; authentication tokens (e.g. JWT) are used for API requests.
- Role checks happen on the backend for every API endpoint, not only in the frontend UI.

### 9.3 Reliability

- A failed data fetch shows a clear error state with a retry button, not a blank screen.
- Export failures are reported to the user with a clear message, not a silent failure.

### 9.4 Usability

- Charts use clear axis labels and legends; a manager should not need a tutorial to read them.
- Filter controls are visible and accessible at all times while browsing charts, not buried in a separate settings page.
- Color choices in charts remain distinguishable for common forms of color blindness.

### 9.5 Maintainability

- Chart components are built as reusable pieces (one line chart component, one bar chart component) that accept data and configuration as props, not duplicated per screen.
- API endpoints for aggregated data are documented and versioned, so the frontend and backend can evolve independently.

## 10. Technical Architecture

### 10.1 Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript |
| Charting | Recharts (default choice) or Chart.js |
| Data fetching/caching | React Query (TanStack Query) |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Authentication | JWT-based auth issued by the backend |
| Export (PDF) | A server-side or client-side PDF generation library (e.g. Puppeteer for server-rendered PDFs, or a client-side library if export is generated in-browser) |
| Export (Excel) | A library such as ExcelJS or SheetJS on the backend to generate .xlsx files |

### 10.2 Component Overview

```
[React + TypeScript SPA]
         |
   REST API (JSON)
         |
[Node.js / Express API]
         |
   [PostgreSQL: sales/production data, aggregation views]
         |
   [Export generation: PDF/Excel, triggered by API request]
```

### 10.3 Data Model (Simplified)

| Table | Key Columns |
|---|---|
| branches | id, name, region |
| product_categories | id, name |
| products | id, name, category_id |
| sales_records (or production_records) | id, branch_id, product_id, quantity, value, record_date |
| users | id, email, password_hash, role |

### 10.4 API Endpoint Examples

| Endpoint | Purpose |
|---|---|
| `GET /api/dashboard/trend?start=...&end=...&branch=...&category=...` | Returns time-series data for the line chart |
| `GET /api/dashboard/branch-comparison?start=...&end=...&category=...` | Returns aggregated totals per branch for the bar chart |
| `GET /api/dashboard/category-comparison?start=...&end=...&branch=...` | Returns aggregated totals per category |
| `GET /api/dashboard/summary?start=...&end=...&branch=...&category=...` | Returns summary card totals and period-over-period change |
| `POST /api/exports/pdf` | Generates and returns a PDF for the current filter set |
| `POST /api/exports/excel` | Generates and returns an Excel file for the current filter set |

### 10.5 Core Business Rules

1. Aggregation (sums, averages, grouping by date/branch/category) happens in PostgreSQL queries or materialized views, not in frontend JavaScript.
2. Every chart and summary card on the dashboard reads from the same active filter state at the same time, so nothing on screen can show mismatched date ranges.
3. Exported files must reflect exactly the filters active at export time. No export should silently include unfiltered data.
4. React Query cache keys are built from the full filter combination (date range + branch + category), so switching between previously seen filter combinations never triggers an unnecessary refetch.

## 11. Data Spec

### 11.1 Entities, Fields, Types, and Required Fields

**users**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint, PK | Yes | |
| name | varchar(150) | Yes | |
| email | varchar(150), unique | Yes | |
| password_hash | varchar(255) | Yes | |
| role | enum(viewer, admin) | Yes | default viewer |
| is_active | boolean | Yes | default true |
| created_at / updated_at | timestamp | Yes | |

**branches**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint, PK | Yes | |
| name | varchar(150) | Yes | |
| region | varchar(100) | No | optional grouping above branch level |
| is_active | boolean | Yes | default true |

**product_categories**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint, PK | Yes | |
| name | varchar(150) | Yes | |
| is_active | boolean | Yes | default true |

**products**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint, PK | Yes | |
| name | varchar(150) | Yes | |
| category_id | bigint, FK -> product_categories.id | Yes | |
| is_active | boolean | Yes | default true |

**sales_records** (or **production_records**, same shape, named per deployment context)

| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint, PK | Yes | |
| branch_id | bigint, FK -> branches.id | Yes | |
| product_id | bigint, FK -> products.id | Yes | |
| quantity | numeric(12,2) | Yes | units sold or produced |
| value | numeric(14,2) | No | monetary value, required for sales context, optional for pure production context |
| record_date | date | Yes | the date the transaction or production run occurred |
| source | varchar(50) | No | e.g. manual entry, import, sync job, for traceability |
| created_at | timestamp | Yes | |

**export_logs**

| Field | Type | Required | Notes |
|---|---|---|---|
| id | bigint, PK | Yes | |
| user_id | bigint, FK -> users.id | Yes | who requested the export |
| format | enum(pdf, excel) | Yes | |
| filter_snapshot | json | Yes | the exact date range, branch(es), category(ies) used, per FR-EXP-03 |
| status | enum(success, failed) | Yes | |
| created_at | timestamp | Yes | |

### 11.2 Relations and Delete Rules

| Relation | Type | Delete Rule | Reasoning |
|---|---|---|---|
| branches -> sales_records | 1-N | Restrict | A branch with historical records cannot be deleted; deactivate (is_active = false) instead to preserve reporting history |
| product_categories -> products | 1-N | Restrict | A category still referenced by products cannot be deleted; deactivate instead |
| products -> sales_records | 1-N | Restrict | A product with historical records cannot be deleted; deactivate instead |
| users -> export_logs | 1-N | Restrict | Export history must remain traceable even if the requesting user's account is later deactivated |
| users -> sales_records | None (no direct link) | N/A | Records are owned by the branch/product combination, not by an individual user; no FK relation needed |

**General rule:** branches, categories, and products are never hard-deleted once they have associated records, since doing so would silently break historical trend charts (a deleted branch would vanish from past comparisons, not just future ones). `is_active = false` is the standard removal mechanism across all master data entities, consistent with the other projects in this portfolio.

### 11.3 Data Ownership

| Data | Owned by | Who can read | Who can write |
|---|---|---|---|
| Sales/production records | The company (not an individual user) | Any authenticated viewer or admin, filtered by their access scope | Admin, or an automated sync/import process |
| Branch, category, product master data | The company | All authenticated users (read, for filter options) | Admin only |
| User accounts | The company, managed by admin | Admin (all), user (own profile) | Admin only |
| Export logs | The requesting user | The requesting user, and admin (for audit) | Created automatically by the system on export, never edited |

**Note:** unlike the leave portal or SOP app, this dashboard's core data (sales/production records) is not "owned" by an individual employee or department in a way that restricts visibility. For MVP, all authenticated viewers can see all branches (see section 6, Roles and Access). If branch-level restriction becomes a requirement (see Open Questions), this ownership model would need a `branch_id` scoping rule added to the `users` table and enforced on every read endpoint.

## 12. Action Inventory

| Action ID | Page | UI Element | Endpoint | Entity | Success Result | Failure Result |
|---|---|---|---|---|---|---|
| ACT-01 | Login | "Log In" button | `POST /api/login` | users | Session token issued, redirected to dashboard | Error message "Invalid email or password," form stays editable |
| ACT-02 | Dashboard | Date range filter dropdown | `GET /api/dashboard/trend`, `/branch-comparison`, `/category-comparison`, `/summary` | sales_records | All charts and cards update to reflect the new date range, no manual refresh needed | Error state on affected charts with a retry option if the request fails |
| ACT-03 | Dashboard | Branch filter dropdown | Same endpoints as ACT-02, with `branch` parameter | sales_records | Charts and cards update to reflect selected branch(es) | Same as ACT-02 |
| ACT-04 | Dashboard | Category filter dropdown | Same endpoints as ACT-02, with `category` parameter | sales_records | Charts and cards update to reflect selected category(ies) | Same as ACT-02 |
| ACT-05 | Dashboard | Hover/tap on a chart data point | None (client-side, uses already-fetched data) | sales_records (cached) | Tooltip shows exact value, date, and series name | N/A, purely client-side rendering |
| ACT-06 | Dashboard | "Export" button → "Export to PDF" | `POST /api/exports/pdf` | sales_records, export_logs | PDF file generated and downloaded, export_logs entry created with status success | Error message shown, export_logs entry created with status failed, user can retry |
| ACT-07 | Dashboard | "Export" button → "Export to Excel" | `POST /api/exports/excel` | sales_records, export_logs | Excel file generated and downloaded, export_logs entry created with status success | Error message shown, export_logs entry created with status failed, user can retry |
| ACT-08 | Admin: Data Sources | "Refresh Sync" button | `POST /api/admin/sync-trigger` | sales_records | Sync job triggered, status indicator updates to "syncing," then "last synced at [time]" | Error message if sync fails to start or fails mid-process, status indicator shows "sync failed" |
| ACT-09 | Admin: Users | "Add User" button | `POST /api/users` | users | New user created, appears in user list | Validation error (e.g. duplicate email) shown inline; user not created |
| ACT-10 | Admin: Branches/Categories | "Deactivate" toggle | `PATCH /api/branches/{id}` or `/api/product-categories/{id}` (is_active=false) | branches, product_categories | Entity hidden from filter options for new views, existing historical charts unaffected | Error if attempting hard delete while records reference this entity; blocked, deactivation suggested instead |

## 13. Acceptance Criteria per Feature

### 13.1 General (All Pages)

- A brand-new company account with no sales/production records yet shows a clear empty state on the dashboard (e.g. "No data available yet. Once records are synced or entered, your charts will appear here.") instead of blank charts or an indefinite loading spinner.
- Newly available data (e.g. after a sync completes, or after an admin adds a new branch) appears in relevant filters and charts without the user needing to manually refresh the page.
- Dashboard state (selected filters, current view) remains consistent after a full page refresh and after navigating to another menu (e.g. Admin) and back.

### 13.2 Dashboard Filtering and Charts

- A new deployment with no records shows the empty state described above across all charts and summary cards simultaneously, not inconsistently (e.g. one chart empty while another shows an error).
- Changing any filter (date, branch, category) updates every chart and summary card on the page without a manual refresh, per FR-FLT-04.
- After refreshing the page, previously selected filters persist within the same session per FR-FLT-06, and the dashboard re-renders with the same filter state rather than resetting to default.
- After navigating away to the Admin section and back to the Dashboard, the previously selected filters and chart state are still correct, not reset or stale.
- If a filter combination returns zero records, the chart shows the empty state defined in the design system (section 5.5), not a blank or broken chart.

### 13.3 Export

- Exporting with no data in the current filter (e.g. a date range with zero records) is either disabled with an explanatory tooltip, or produces a file that clearly states "No data for the selected filters" rather than a blank or broken file.
- A successful export immediately reflects in the user's awareness through a success confirmation (toast or similar), without needing to check a separate log page.
- Export history (for admin review) persists correctly after a page refresh and after navigating between menu sections.

### 13.4 Administration

- A freshly installed system with only the initial admin account shows an empty state on Admin: Branches and Admin: Users prompting the admin to add the first entries.
- A newly added branch, category, or user appears in its respective list immediately after creation, without a manual refresh, and also appears as a new filter option on the dashboard without a manual refresh.
- Branch, category, and user data persist correctly after a page refresh and after switching between admin menu sections.

## 14. UI Requirements

### 14.1 Main Screens

| Screen | Main Content |
|---|---|
| Login | Email and password form |
| Dashboard | Filter bar, summary cards, line chart, branch bar chart, category bar chart |
| Export (modal or inline action) | Format choice (PDF/Excel), confirmation of active filters, download trigger |
| Admin: Data Sources (admin only) | Status of data sync, manual refresh trigger if applicable |

### 14.2 Design Principles

- Filters stay visible and sticky while scrolling through charts. A manager should never lose track of what date range or branch they're looking at.
- Every chart answers one question clearly. Avoid cramming multiple unrelated metrics into a single chart.
- Numbers that matter most (totals, trend direction) are visible without scrolling, in the summary cards at the top.

## 15. Release Plan

| Phase | Scope | Estimated Duration |
|---|---|---|
| Phase 0 | Data model and aggregation query design, auth setup, project scaffolding | 1 to 2 weeks |
| Phase 1 (MVP) | Filters, line chart, bar charts, summary cards, PDF/Excel export, React Query integration | 5 to 6 weeks |
| Phase 2 | Role-based branch restriction, saved filter presets, additional chart types | 2 to 3 weeks |
| Phase 3 (optional) | Forecasting/trend prediction, custom dashboard layout | To be scoped later |

## 16. Testing Strategy

- **Unit tests:** aggregation query logic, filter-to-query-parameter mapping, React Query cache key generation.
- **Integration tests:** full flow from filter selection to chart rendering with real sample data.
- **Export tests:** verify exported PDF and Excel files match the filters active at export time, using a known sample dataset.
- **Performance tests:** verify dashboard load time and query response time against a dataset representative of production scale.
- **UAT:** a manager runs through exploring a trend, comparing branches, and exporting a report.

## 17. Risks and Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Underlying dataset grows large and aggregation queries slow down | Dashboard becomes sluggish | Use indexed queries and consider materialized views or a scheduled aggregation table for heavy date ranges |
| Managers expect real-time data but the system only syncs periodically | Confusion about data freshness | Show a clear "data as of [timestamp]" label on the dashboard |
| PDF export doesn't visually match what's on screen | Exported report looks unprofessional or inconsistent | Use consistent chart rendering logic between screen and export generation |
| Branch-level data access turns out to be required, not optional | Rework needed after MVP ships | Confirm this requirement explicitly before Phase 1 starts (see Open Questions) |

## 18. Assumptions and Dependencies

**Assumptions**
- Underlying sales or production data is already collected somewhere and can be loaded into PostgreSQL, either via direct entry, import, or a sync process. Building that source data pipeline is a separate concern from this dashboard.
- All authenticated managers can see all branches for MVP, unless confirmed otherwise before Phase 1 begins.

**Dependencies**
- A reliable source for the underlying sales/production data needs to be established before the dashboard has anything meaningful to show.
- PDF export library choice (server-side vs client-side generation) should be decided early, since it affects backend architecture.

## 19. Future Enhancements (Backlog)

- Branch managers restricted to see only their own branch's data.
- Saved filter presets per user ("My Weekly View").
- Scheduled automatic report emails (e.g. a weekly PDF sent every Monday).
- Forecasting or trend prediction based on historical data.
- Drill-down from a chart directly into the underlying raw transaction list.
- Custom dashboard layout (user rearranges or adds widgets).

## 20. Open Questions

1. Does a branch manager need to be restricted to only their own branch's data, or is company-wide visibility acceptable for all managers in MVP?
2. How frequently does the underlying data need to sync (real-time, hourly, daily)?
3. Is PDF export expected to look like a polished report, or is a straightforward chart-and-table printout acceptable for MVP?
4. What is the expected data volume (rows per year) this dashboard needs to handle at launch and after 1-2 years of growth?

## 21. Glossary

| Term | Meaning |
|---|---|
| Aggregation | Combining many data rows into a summary value (e.g. sum of sales per month) |
| React Query | A library for fetching, caching, and synchronizing server data in React apps |
| Materialized view | A database object that stores the precomputed result of a query, refreshed periodically, used to speed up heavy aggregation |
| Period-over-period change | Comparison of the current period's total against the previous period (e.g. this month vs last month) |
