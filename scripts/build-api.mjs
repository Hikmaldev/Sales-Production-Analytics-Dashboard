// Bundles the serverless entry (server/vercel.ts) into api/index.js.
//
// Vercel does not compile TypeScript sources outside the api/ directory, so
// the entry is pre-bundled here. npm packages stay external: Vercel traces
// and includes them (including pdfkit's font data) at deploy time.
//
// Usage: npm run build:api   (called by the Vercel build command)

import { build } from "esbuild";

await build({
  entryPoints: ["server/vercel.ts"],
  outfile: "api/index.js",
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  packages: "external",
  sourcemap: false,
  logLevel: "info",
});

console.log("Built api/index.js");
