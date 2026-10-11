import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Force the whole suite onto the dedicated test database before any test
// file imports the server (server/config.ts reads process.env on import).
const testEnv = dotenv.config({ path: ".env.test" }).parsed ?? {};
const testDatabaseUrl = testEnv.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error(
    "TEST_DATABASE_URL is missing. Create .env.test (see .env.example) before running the test suite.",
  );
}

process.env.DATABASE_URL = testDatabaseUrl;
process.env.DIRECT_URL = testDatabaseUrl;
process.env.JWT_SECRET = "vitest-secret";
process.env.JWT_EXPIRES_IN = "1h";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup.ts"],
    // Test files share one database; run them one at a time.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
});
