import { compare } from "bcryptjs";

import type {
  LoginResponse,
  SessionUser,
} from "../../src/shared/schemas/responses";
import { createSessionToken } from "../auth/tokens";
import { prisma } from "../db";
import { HttpError } from "../errors";

const INVALID_CREDENTIALS = "Invalid email or password.";

/** ACT-01 — validates credentials, records last_login_at, signs a JWT. */
export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  // Same message for unknown email and wrong password (no user enumeration).
  if (!user || !user.isActive) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  const passwordMatches = await compare(password, user.passwordHash);
  if (!passwordMatches) {
    throw new HttpError(401, INVALID_CREDENTIALS);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return {
    token: createSessionToken(user.id, user.role),
    user: toSessionUser(user),
  };
}

/** GET /me — restores the session for a stored token. */
export async function getSessionUser(userId: bigint): Promise<SessionUser> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "This account is no longer active.");
  }
  return toSessionUser(user);
}

function toSessionUser(user: {
  id: bigint;
  name: string;
  email: string;
  role: "viewer" | "admin";
}): SessionUser {
  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
  };
}
