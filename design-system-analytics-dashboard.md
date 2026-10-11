# Design System

## Sales / Production Analytics Dashboard

| Item | Detail |
|---|---|
| Document version | 1.0 (Draft) |
| Date | October 9, 2026 |
| Companion document | PRD-Sales-Production-Analytics-Dashboard.md |
| Built for | React, TypeScript, Recharts or Chart.js |

---

## 1. Overview

This dashboard exists to answer one question fast: **is the trend going up or down, and where.** A manager glances at it between meetings, not studies it for an hour. Every design choice here optimizes for speed of reading, not visual richness.

Three principles guide this system:

1. **Numbers first, decoration never.** A chart earns its space by answering a question in under five seconds. If it needs a long caption to explain itself, it's the wrong chart.
2. **Filters are always visible.** A manager should never lose track of what date range or branch they're looking at mid-scroll.
3. **Color means something, consistently.** The same color always represents the same branch or the same direction of change, everywhere on the dashboard.

## 2. Colors

### 2.1 Core Palette

| Token | Hex | Tailwind-equivalent | Usage |
|---|---|---|---|
| `ink-900` | `#111318` | `text-neutral-900` | Primary text, chart labels |
| `ink-600` | `#565C66` | `text-neutral-600` | Secondary text, axis labels |
| `surface-0` | `#FFFFFF` | `bg-white` | Card backgrounds |
| `surface-100` | `#F3F4F6` | `bg-neutral-100` | Page background |
| `border-200` | `#DEE1E6` | `border-neutral-300` | Card borders, gridlines |
| `accent-600` | `#2F5FBF` | `bg-blue-700` | Primary actions, selected filter chips |

### 2.2 Data Colors (Chart Palette)

This is the part of the system that does the real work. Charts compare branches and categories, so the palette needs enough distinct, readable hues that a legend with six branches doesn't turn into mud.

| Series order | Token | Hex | Usage |
|---|---|---|---|
| 1 | `data-1` | `#2F5FBF` (blue) | First series / primary branch or metric |
| 2 | `data-2` | `#D97706` (amber) | Second series |
| 3 | `data-3` | `#15803D` (green) | Third series |
| 4 | `data-4` | `#9333EA` (purple) | Fourth series |
| 5 | `data-5` | `#DB2777` (pink) | Fifth series |
| 6 | `data-6` | `#0891B2` (teal) | Sixth series |

**Rule:** series colors are assigned in this fixed order every time, by index, not randomly. If "Branch A" is `data-1` (blue) on the trend chart, it stays blue on the branch comparison chart too. A manager who learns "blue is Branch A" should never have to relearn it on a different chart.

### 2.3 Directional Colors (Change Indicators)

Separate from the data palette above. These exist only for period-over-period change indicators on summary cards.

| Token | Hex | Usage |
|---|---|---|
| `trend-up` | `#15803D` (green) | Positive change (e.g. sales increased) |
| `trend-down` | `#B3261E` (red) | Negative change (e.g. sales decreased) |
| `trend-flat` | `#565C66` (gray) | No meaningful change |

**Rule:** green and red here mean "went up" and "went down," full stop. Never use green or red from this pair as a data series color (section 2.2), because a reader's eye will instinctively read a green line as "good news" even when it's just Branch C's assigned color. Keep the two palettes strictly separate.

### 2.4 Semantic Colors (UI States)

| Token | Hex | Usage |
|---|---|---|
| `success` | `#15803D` | Successful export confirmation |
| `error` | `#B3261E` | Failed data fetch, failed export |
| `warning` | `#D97706` | Stale data warning (e.g. "data as of 3 days ago") |
| `info` | `#2F5FBF` | Informational tooltips |

## 3. Typography

### 3.1 Typeface

**Inter** across the whole app, with tabular figures enabled for any numeric table or axis (`font-variant-numeric: tabular-nums`). This single setting matters more than it sounds: tabular figures keep digit widths consistent, so a column of numbers in a summary card or export table lines up vertically instead of jittering as digits change.

### 3.2 Type Scale

| Token | Size | Weight | Usage |
|---|---|---|---|
| `metric-xl` | 32px / 1.2 | 700 | The big number on a summary card |
| `metric-change` | 14px / 1.3 | 600 | The percentage change next to a metric |
| `heading-lg` | 20px / 1.3 | 600 | Chart section titles |
| `heading-sm` | 15px / 1.4 | 600 | Chart titles inside a card |
| `body` | 14px / 1.5 | 400 | Filter labels, legend text |
| `axis-label` | 12px / 1.3 | 500 | Chart axis tick labels |
| `caption` | 12px / 1.4 | 400 | "Data as of" timestamps, footnotes |

### 3.3 Rules

- The summary card metric (`metric-xl`) is always the largest, boldest text on the dashboard. Nothing else competes with it for visual weight. If a page has five summary cards, all five numbers are equally prominent; no card is styled to seem more important than another unless the data itself says so.
- Chart axis labels never exceed `axis-label` size. A big, bold axis label competes with the data line it's supposed to support.
- Numbers always use tabular figures. Labels and prose never do.

## 4. Elevation

Elevation separates the content layer from the background, and nothing else.

| Level | CSS | Usage |
|---|---|---|
| `elevation-0` | `box-shadow: none; border: 1px solid #DEE1E6` | Chart cards, summary cards, the main content frame |
| `elevation-1` | `box-shadow: 0 1px 3px rgba(17,19,24,0.08)` | The sticky filter bar when scrolled |
| `elevation-2` | `box-shadow: 0 4px 12px rgba(17,19,24,0.12)` | Export modal, dropdown menus |

**Rule:** chart cards sit flat against the page, bordered not shadowed. Shadow is reserved for things that move or float above the content, like the sticky filter bar once it detaches from the top of the page, or a modal. A dashboard full of floating, shadowed cards looks busy and undermines the "numbers first" principle.

## 5. Components

### 5.1 Summary Card

```
┌─────────────────────────────┐
│ TOTAL SALES          label  │
│ Rp 482.3M          metric-xl│
│ ▲ 12.4% vs last month        │  trend-up color, metric-change
└─────────────────────────────┘
```

Padding: 20px. Border: `border-200`, 1px, `elevation-0`. The trend arrow and percentage always sit directly under the number, never beside it, so a quick vertical scan down a row of cards reads consistently.

### 5.2 Line Chart (Trend)

- X-axis: time, always left-to-right chronological, never reversed.
- Y-axis: starts at zero by default. Truncating the Y-axis to exaggerate a trend is explicitly disallowed (see Do's and Don'ts), because it misleads a manager making a real decision.
- Line weight: 2px, using the series color order from section 2.2.
- Data point markers appear only on hover, not permanently on every point. Permanent markers on a long time range turn into visual noise.
- Gridlines: horizontal only, `border-200` at low opacity, never vertical gridlines competing with the data.

### 5.3 Bar Chart (Comparison)

- Bars ordered by value, highest to lowest, by default, not alphabetically. A manager comparing branches wants to see the ranking immediately, not hunt for it.
- Bar color follows the same fixed series assignment as the line chart, so if a branch is blue in the trend legend, its bar is the same blue here.
- Bar width stays consistent regardless of how many categories are shown; the chart container scales, not the bar width, so a 3-branch comparison and a 12-branch comparison both read cleanly.

### 5.4 Filter Bar

```
[ Date Range: This Month ▾ ] [ Branch: All ▾ ] [ Category: All ▾ ]        [ Export ▾ ]
```

Sticky to the top of the viewport once the user scrolls past it (`elevation-1` activates on stick). Each active filter that isn't the default shows as a small removable chip below the dropdown row, so a manager always sees "oh, I filtered to Branch A and Q3" without opening each dropdown to check.

### 5.5 Empty State

Used when a filter combination returns no data (FR-CHT-06). Centered in the chart card, simple icon, one line of text: "No data for the selected filters." Followed by a text link: "Clear filters." Never an empty chart frame with just gridlines and no explanation, since that reads as a bug, not an answer.

### 5.6 Loading State

Chart cards show a skeleton shape matching the chart type (a flat skeleton line for line charts, skeleton bars for bar charts) rather than a generic spinner. This keeps the layout stable and gives the user a preview of what's about to render, reducing the jarring layout shift when real data arrives.

### 5.7 Export Button and Modal

Export button: secondary style (`border-200`, white background), paired with a small download icon, never styled as the loudest action on the screen. Exporting is a supporting action, not the primary thing a manager does on this dashboard.

Modal content on click: format choice (PDF / Excel), a one-line summary of the active filters that will be included ("Exporting: Jan 1 – Mar 31, 2026 · All Branches · All Categories"), and a confirm button. This directly supports FR-EXP-03, showing the manager exactly what they're about to download before they download it.

## 6. Spacing

8px base grid, matching the component density this dashboard needs: enough breathing room to read a chart clearly, not so much that five charts require five screens of scrolling.

| Token | Value | Usage |
|---|---|---|
| `space-1` | 4px | Icon-to-text gaps, chip padding |
| `space-2` | 8px | Internal gaps between related elements |
| `space-3` | 12px | Gap between a chart title and its chart |
| `space-4` | 16px | Card internal padding |
| `space-6` | 24px | Gap between cards in the dashboard grid |
| `space-8` | 32px | Page-level padding on desktop |

**Rule:** the gap between cards (`space-6`, 24px) is always larger than the padding inside a card (`space-4`, 16px). This keeps each chart reading as a distinct, separate unit rather than bleeding into its neighbor.

## 7. Border Radius

| Token | Value | Usage |
|---|---|---|
| `radius-sm` | 4px | Filter chips, buttons |
| `radius-md` | 8px | Chart cards, summary cards, modals |
| `radius-full` | 9999px | Trend indicator pill (the up/down arrow badge) |

Nothing on this dashboard uses a radius larger than `radius-md`. Large, soft rounded corners read as playful or consumer-facing; this is a tool for reading numbers quickly, and the shape language stays correspondingly restrained.

## 8. Do's and Don'ts

### Charts and Data Integrity

✅ **Do** start every Y-axis at zero by default.
❌ **Don't** truncate a Y-axis to make a small change look dramatic. A line chart going from a truncated axis can make a 2% change look like a 50% swing. This dashboard exists to inform real decisions; a misleading chart is worse than a raw table.

✅ **Do** keep a series' assigned color consistent across every chart it appears in.
❌ **Don't** let the charting library auto-assign colors independently per chart. Two charts on the same screen showing Branch A in blue on one and green on the other actively works against quick reading.

✅ **Do** show "data as of [timestamp]" somewhere visible on the dashboard.
❌ **Don't** let a manager assume the dashboard is real-time if it isn't. Silence about data freshness erodes trust the first time someone notices a discrepancy.

### Filters

✅ **Do** keep the filter bar visible and sticky while scrolling through charts.
❌ **Don't** bury filters in a collapsed panel that has to be reopened to check what's currently selected.

✅ **Do** show active non-default filters as removable chips.
❌ **Don't** make a manager open every dropdown just to confirm what they're currently viewing.

### Layout and Density

✅ **Do** let each chart answer one clear question (the trend, or the branch comparison), each on its own card.
❌ **Don't** combine unrelated metrics onto a single chart just to save space. Dual-axis charts mixing, say, revenue and headcount, read as clever but actually slow a manager down.

✅ **Do** size the summary cards equally, same type scale, same card style, regardless of which metric they show.
❌ **Don't** make one summary card visually louder than another unless the data itself warrants the emphasis (e.g. an alert state for a metric that's significantly off target).

### Export

✅ **Do** show the exact filters that will be included before confirming an export.
❌ **Don't** let an exported PDF or Excel file silently include unfiltered data, or data from a different range than what's currently on screen. A manager presenting a mismatched report in a meeting is a trust problem, not just a UX annoyance.
