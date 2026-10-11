// Runs a command against the dedicated test database from .env.test.
// Usage: node scripts/with-test-db.mjs prisma migrate reset --force
//
// Safety guard: refuses to run when the test database host matches the host
// of DATABASE_URL in .env (i.e. the development database).

import { spawnSync } from "node:child_process";

import dotenv from "dotenv";

const testUrl = dotenv.config({ path: ".env.test" }).parsed?.TEST_DATABASE_URL;
if (!testUrl) {
  console.error("TEST_DATABASE_URL is missing in .env.test.");
  process.exit(1);
}

const mainUrl = dotenv.config({ path: ".env" }).parsed?.DATABASE_URL ?? "";
const host = (url) => {
  const match = /@([^/]+)\//.exec(url);
  return match ? match[1] : null;
};

if (!host(testUrl) || host(testUrl) === host(mainUrl)) {
  console.error(
    "Refusing to run: the test database host matches the development database host.",
  );
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error("Usage: node scripts/with-test-db.mjs <command> [...args]");
  process.exit(1);
}

console.log(`Using test database host: ${host(testUrl)}`);
const result = spawnSync(command, args, {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: testUrl, DIRECT_URL: testUrl },
});

process.exit(result.status ?? 1);
