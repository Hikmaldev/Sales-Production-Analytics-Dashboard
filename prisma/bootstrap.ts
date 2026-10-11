// First-run bootstrap for a fresh deployment (no seed data):
// creates the initial administrator account on an empty database.
//
// Usage:
//   npm run db:bootstrap -- --email owner@company.com --password "S3curePass!" --name "Owner"
// or set ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME environment variables.
//
// Refuses to run when any user already exists — after that, add accounts
// through Admin: Users in the dashboard.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "bcryptjs";

import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main(): Promise<void> {
  const email = (readArg("--email") ?? process.env.ADMIN_EMAIL ?? "")
    .trim()
    .toLowerCase();
  const password = readArg("--password") ?? process.env.ADMIN_PASSWORD ?? "";
  const name = (readArg("--name") ?? process.env.ADMIN_NAME ?? "Administrator")
    .trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Provide a valid admin email (--email or ADMIN_EMAIL).");
  }
  if (password.length < 8) {
    throw new Error(
      "Admin password must be at least 8 characters (--password or ADMIN_PASSWORD).",
    );
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw new Error(
      "Refusing to bootstrap: the users table is not empty. Add accounts through the admin UI instead.",
    );
  }

  const user = await prisma.user.create({
    data: {
      name: name || "Administrator",
      email,
      role: "admin",
      passwordHash: await hash(password, 10),
    },
  });

  console.log(`Administrator created: ${user.email} (id ${user.id}).`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
