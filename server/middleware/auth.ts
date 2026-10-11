import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import { config } from "../config";
import { prisma } from "../db";
import { HttpError } from "../errors";

export interface AuthUser {
  id: bigint;
  name: string;
  email: string;
  role: "viewer" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      authUser?: AuthUser;
    }
  }
}

const SESSION_ERROR = "Your session has expired. Please log in again.";

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw new HttpError(401, "Authentication required.");
  }

  const token = header.slice("Bearer ".length);
  let subject: bigint;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    if (typeof payload === "string" || !payload.sub) {
      throw new Error("Missing subject.");
    }
    subject = BigInt(String(payload.sub));
  } catch {
    throw new HttpError(401, SESSION_ERROR);
  }

  const user = await prisma.user.findUnique({ where: { id: subject } });
  if (!user || !user.isActive) {
    throw new HttpError(401, "This account is no longer active.");
  }
  req.authUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  next();
}

export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (req.authUser?.role !== "admin") {
    throw new HttpError(403, "Administrator access is required.");
  }
  next();
}
