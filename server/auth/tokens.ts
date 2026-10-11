import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { config } from "../config";

export function createSessionToken(
  userId: bigint,
  role: "viewer" | "admin",
): string {
  return jwt.sign({ sub: String(userId), role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as SignOptions["expiresIn"],
  });
}
