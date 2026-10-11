import { hash } from "bcryptjs";

import type { User as PrismaUser } from "../../generated/prisma/client";
import type { User } from "../../src/shared/schemas/entities";
import type { CreateUserRequest } from "../../src/shared/schemas/requests";
import { prisma } from "../db";
import { HttpError } from "../errors";

const PASSWORD_SALT_ROUNDS = 10;

export async function listUsers(): Promise<User[]> {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  return users.map(toUser);
}

/** ACT-09 — admin creates a user and sets the initial password. */
export async function createUser(input: CreateUserRequest): Promise<User> {
  const email = input.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "A user with this email already exists.");
  }

  const created = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      role: input.role,
      passwordHash: await hash(input.password, PASSWORD_SALT_ROUNDS),
    },
  });

  return toUser(created);
}

function toUser(user: PrismaUser): User {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
  };
}
