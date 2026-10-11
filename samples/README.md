# Sample import files

Ready-to-use files for **Admin → Data sources → Import sales records**.
Generate or refresh them with:

```bash
npm run samples:generate
```

| File | Purpose |
|---|---|
| `import-template.csv` / `.xlsx` | Headers + two example rows; the same content is downloadable from the UI ("Download CSV template"). |
| `import-sample-data.csv` / `.xlsx` | 43 realistic rows for the last 10 days, using the branch/category/product names created by `npm run db:seed`. |

## Columns

| Column | Required | Notes |
|---|---|---|
| `branch` | Yes | Must exist, unless "create missing branches, categories, and products" is checked. |
| `category` | Yes | Same rule as branch. |
| `product` | Yes | Must belong to the category. |
| `quantity` | Yes | Number, 0 or more. |
| `value` | No | Number, 0 or more; leave empty for unit-only records (production context). |
| `record_date` | Yes | `YYYY-MM-DD` (Excel date cells and serial numbers also work). |
| `external_ref` | No | Idempotency key: re-importing a row with the same reference skips it instead of duplicating. |

CSV files may use `,` or `;` as the delimiter; headers are case-insensitive and
may use spaces instead of underscores (`Record Date` works).

## Quick demo flow

```bash
npm run db:seed              # demo data + demo accounts
# then in the UI: Admin → Data sources → Import sales records → upload import-sample-data.csv
```

Uploading the same file twice (or its XLSX twin) reports the rows as skipped,
and every import appears in the sync history with its record count.
