import type { LoginRequest } from "../shared/schemas/requests";
import type { LoginResponse, MeResponse } from "../shared/schemas/responses";
import { apiFetch } from "./client";

/** ACT-01 — POST /api/v1/login. */
export function loginRequest(credentials: LoginRequest): Promise<LoginResponse> {
  return apiFetch("/login", {
    method: "POST",
    body: JSON.stringify(credentials),
  });
}

/** GET /api/v1/me — restores the session for a stored token. */
export function fetchMe(): Promise<MeResponse> {
  return apiFetch("/me");
}

/** POST /api/v1/logout — stateless JWT; the client drops the token. */
export function logoutRequest(): Promise<void> {
  return apiFetch("/logout", { method: "POST" });
}
