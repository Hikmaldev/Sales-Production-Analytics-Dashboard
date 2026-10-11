// Prisma v7 configuration.
// Connection URLs live here (moved out of schema.prisma in Prisma v7).
// Requires during scaffolding: prisma (v7) and dotenv.

import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
