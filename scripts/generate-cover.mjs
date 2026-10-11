// Generates the portfolio cover + architecture diagram as PNG (and keeps the
// cover SVG source). Usage: npm run cover:generate
//
// sharp renders the SVG with the system's sans font, so no font files need
// to be installed.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import sharp from "sharp";

const OUT_DIR = path.resolve(process.cwd(), "docs");
const FONT = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

const LOGO_GROUP = (x, y, scale) => `
  <g transform="translate(${x},${y}) scale(${scale})">
    <rect width="64" height="64" rx="16" fill="#2F5FBF"/>
    <rect x="0.75" y="0.75" width="62.5" height="62.5" rx="15.25" fill="none" stroke="#FFFFFF" stroke-opacity="0.28" stroke-width="1.5"/>
    <rect x="13" y="37" width="9" height="13" rx="3" fill="#FFFFFF" fill-opacity="0.62"/>
    <rect x="26" y="30" width="9" height="20" rx="3" fill="#FFFFFF" fill-opacity="0.82"/>
    <rect x="39" y="22" width="9" height="28" rx="3" fill="#FFFFFF"/>
    <path d="M13 31L26 22.5L43 14" fill="none" stroke="#BCD3FF" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="43" cy="14" r="2.8" fill="#FFFFFF"/>
  </g>`;

/** Approximate pill width: Segoe UI averages ~0.54em per character. */
function chipRow(items, x, y) {
  let cursor = x;
  const height = 54;
  let out = "";
  for (const item of items) {
    const width = Math.round(item.replace(/&amp;/g, "&").length * 21 * 0.54) + 52;
    out += `<rect x="${cursor}" y="${y}" width="${width}" height="${height}" rx="${height / 2}" fill="#FFFFFF" fill-opacity="0.06" stroke="#FFFFFF" stroke-opacity="0.16"/>`;
    out += `<text x="${cursor + width / 2}" y="${y + 35}" font-family="${FONT}" font-size="21" fill="#D6E1F7" text-anchor="middle">${item}</text>`;
    cursor += width + 16;
  }
  return out;
}

function buildCover() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1600" y2="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0B1322"/>
      <stop offset="0.55" stop-color="#101C36"/>
      <stop offset="1" stop-color="#0A1120"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.12" cy="0.05" r="0.75">
      <stop offset="0" stop-color="#2F5FBF" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#2F5FBF" stop-opacity="0"/>
    </radialGradient>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0V80" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#grid)"/>
  <rect width="1600" height="900" fill="url(#glow)"/>

  ${LOGO_GROUP(96, 88, 1.5)}
  <text x="232" y="124" font-family="${FONT}" font-size="30" font-weight="600" fill="#FFFFFF">Sales Analytics</text>
  <text x="232" y="160" font-family="${FONT}" font-size="22" fill="#8FA2C4">Operations dashboard</text>

  <text x="96" y="368" font-family="${FONT}" font-size="62" font-weight="700" fill="#FFFFFF">Sales &amp; Production</text>
  <text x="96" y="444" font-family="${FONT}" font-size="62" font-weight="700" fill="#8CB0F5">Analytics Dashboard</text>
  <text x="96" y="512" font-family="${FONT}" font-size="26" fill="#A9B7D0">Interactive filters, comparisons, and exports.</text>
  <text x="96" y="562" font-family="${FONT}" font-size="21" fill="#8FA2C4">Filters by date range, branch, and product category.</text>

  ${chipRow(["React", "TypeScript", "Express", "Prisma"], 96, 610)}
  ${chipRow(["PostgreSQL · Neon", "Vercel", "Vitest + Supertest"], 96, 682)}

  <text x="96" y="852" font-family="${FONT}" font-size="19" fill="#7C8AA5">Live demo · 62 backend tests (Vitest + Supertest) · Deployed on Vercel + Neon</text>

  <rect x="830" y="120" width="674" height="660" rx="28" fill="#FFFFFF" fill-opacity="0.05" stroke="#FFFFFF" stroke-opacity="0.12"/>
  <text x="872" y="178" font-family="${FONT}" font-size="24" font-weight="600" fill="#E7EEFB">Sales trend</text>
  <text x="872" y="208" font-family="${FONT}" font-size="17" fill="#8FA2C4">Last 30 days · all branches</text>
  <circle cx="1300" cy="166" r="7" fill="#6D9BF5"/>
  <circle cx="1332" cy="166" r="7" fill="#F2B25C"/>
  <circle cx="1364" cy="166" r="7" fill="#56C97A"/>

  ${[0, 1, 2, 3, 4]
    .map(
      (line) =>
        `<line x1="872" y1="${260 + line * 78}" x2="1462" y2="${260 + line * 78}" stroke="#FFFFFF" stroke-opacity="0.08"/>`,
    )
    .join("")}

  <polyline points="872,470 970,428 1068,444 1166,376 1264,392 1362,324 1462,292" fill="none" stroke="#6D9BF5" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="872,516 970,495 1068,505 1166,458 1264,472 1362,420 1462,396" fill="none" stroke="#F2B25C" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="872,552 970,531 1068,540 1166,510 1264,520 1362,478 1462,458" fill="none" stroke="#56C97A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="1462" cy="292" r="7" fill="#FFFFFF"/>
  <circle cx="1462" cy="396" r="7" fill="#FFFFFF"/>
  <circle cx="1462" cy="458" r="7" fill="#FFFFFF"/>

  <rect x="872" y="620" width="286" height="132" rx="18" fill="#FFFFFF" fill-opacity="0.05"/>
  <text x="902" y="662" font-family="${FONT}" font-size="18" fill="#9FB0CC">Total sales</text>
  <text x="902" y="704" font-family="${FONT}" font-size="32" font-weight="700" fill="#FFFFFF">Rp 4.9B</text>
  <text x="902" y="736" font-family="${FONT}" font-size="19" font-weight="600" fill="#56C97A">▲ +18.2% vs previous period</text>

  <rect x="1176" y="620" width="286" height="132" rx="18" fill="#FFFFFF" fill-opacity="0.05"/>
  <text x="1206" y="662" font-family="${FONT}" font-size="18" fill="#9FB0CC">Average daily sales</text>
  <text x="1206" y="704" font-family="${FONT}" font-size="32" font-weight="700" fill="#FFFFFF">Rp 547M</text>
  <text x="1206" y="736" font-family="${FONT}" font-size="19" fill="#8FA2C4">Data as of Oct 11, 2026</text>
</svg>`;
}

function buildArchitecture() {
  const box = (x, y, w, h, accent, title, lines) => `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="20" fill="#FFFFFF" fill-opacity="0.05" stroke="${accent}" stroke-opacity="0.65" stroke-width="2"/>
    <text x="${x + 28}" y="${y + 52}" font-family="${FONT}" font-size="26" font-weight="700" fill="#FFFFFF">${title}</text>
    ${lines
      .map(
        (line, index) =>
          `<text x="${x + 28}" y="${y + 92 + index * 32}" font-family="${FONT}" font-size="19" fill="#A9B7D0">${line}</text>`,
      )
      .join("")}`;

  const arrow = (x, y) => `
    <line x1="${x}" y1="${y}" x2="${x + 52}" y2="${y}" stroke="#5B8DEF" stroke-width="3"/>
    <path d="M${x + 56} ${y} l-12 -7 v14 z" fill="#5B8DEF"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1600" y2="900" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#0B1322"/>
      <stop offset="0.55" stop-color="#101C36"/>
      <stop offset="1" stop-color="#0A1120"/>
    </linearGradient>
    <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
      <path d="M80 0H0V80" fill="none" stroke="#FFFFFF" stroke-opacity="0.05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1600" height="900" fill="url(#bg)"/>
  <rect width="1600" height="900" fill="url(#grid)"/>

  ${LOGO_GROUP(96, 72, 1.25)}
  <text x="204" y="104" font-family="${FONT}" font-size="26" font-weight="700" fill="#FFFFFF">Sales Analytics</text>
  <text x="204" y="134" font-family="${FONT}" font-size="19" fill="#8FA2C4">Architecture overview</text>

  ${box(96, 300, 380, 230, "#6D9BF5", "Web app", ["React 19 · TypeScript · Vite", "TanStack Query per filter combo", "Recharts · sticky filters"])}
  ${arrow(496, 415)}
  ${box(572, 300, 480, 230, "#F2B25C", "REST API", ["Express 5 · Zod validation", "JWT auth · viewer / admin roles", "Route → Controller → Service"])}
  ${arrow(1072, 415)}
  ${box(1148, 300, 356, 230, "#56C97A", "PostgreSQL", ["Neon · Prisma 7 adapter", "All aggregation in SQL", "Migrations + demo seed"])}

  ${box(572, 596, 480, 172, "#5B8DEF", "Data pipeline", ["CSV / XLSX import, per-row validation", "Idempotent external_ref · sync history"])}
  <line x1="740" y1="596" x2="740" y2="542" stroke="#5B8DEF" stroke-width="3"/>
  <path d="M740 538 l-7 12 h14 z" fill="#5B8DEF"/>

  ${box(1148, 596, 356, 172, "#A78BFA", "Exports", ["PDF (PDFKit) · Excel (ExcelJS)", "Same filters as screen · logged"])}
  <path d="M1326 592 v-28 h-344 v-26" fill="none" stroke="#A78BFA" stroke-width="3" stroke-linejoin="round"/>
  <path d="M982 538 l-7 12 h14 z" fill="#A78BFA"/>

  <text x="96" y="600" font-family="${FONT}" font-size="19" fill="#7C8AA5">Served as a single</text>
  <text x="96" y="630" font-family="${FONT}" font-size="19" fill="#7C8AA5">Vercel Function</text>
  <text x="96" y="660" font-family="${FONT}" font-size="19" fill="#7C8AA5">(region sin1)</text>

  <text x="96" y="856" font-family="${FONT}" font-size="19" fill="#7C8AA5">62 backend tests (Vitest + Supertest) · dedicated test database · deployed on Vercel + Neon</text>
</svg>`;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const coverSvg = buildCover();
  writeFileSync(path.join(OUT_DIR, "cover.svg"), coverSvg);
  await sharp(Buffer.from(coverSvg)).png().toFile(path.join(OUT_DIR, "cover.png"));

  await sharp(Buffer.from(buildArchitecture()))
    .png()
    .toFile(path.join(OUT_DIR, "architecture.png"));

  console.log("Wrote docs/cover.png, docs/cover.svg, docs/architecture.png");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
