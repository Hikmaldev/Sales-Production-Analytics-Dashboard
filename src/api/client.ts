// Shared HTTP helpers for the Express API (see server/). Keeps token
// handling, JSON parsing, download handling, and error mapping in one place.

export const API_BASE_URL = "/api/v1";

const TOKEN_STORAGE_KEY = "sales-analytics.token";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getAuthToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Storage can be unavailable (private mode); the in-memory session works.
  }
}

export function clearAuthToken(): void {
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export async function apiFetch<TResponse>(
  path: string,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, withAuthHeaders(init));

  if (!response.ok) {
    throw await toApiError(response, path);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

export interface DownloadedFile {
  blob: Blob;
  filename: string;
}

/** POSTs a JSON body and returns the response as a file download. */
export async function apiDownload(
  path: string,
  body: unknown,
): Promise<DownloadedFile> {
  const response = await fetch(
    `${API_BASE_URL}${path}`,
    withAuthHeaders({
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

  if (!response.ok) {
    throw await toApiError(response, path);
  }

  return {
    blob: await response.blob(),
    filename:
      parseFilename(response.headers.get("Content-Disposition")) ?? "export",
  };
}

export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function withAuthHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  // Let the browser set the multipart boundary for file uploads.
  if (init?.body && !isFormData && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getAuthToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...init, headers };
}

async function toApiError(response: Response, path: string): Promise<ApiError> {
  let message = `Request failed with status ${response.status}.`;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    if (body.error?.message) {
      message = body.error.message;
    }
  } catch {
    // Response had no JSON body; keep the default message.
  }

  // An expired/invalid token mid-session: drop it and let AuthContext react.
  if (response.status === 401 && path !== "/login") {
    clearAuthToken();
    window.dispatchEvent(new Event("auth:unauthorized"));
  }

  return new ApiError(response.status, message);
}

function parseFilename(disposition: string | null): string | null {
  if (!disposition) return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  return match ? decodeURIComponent(match[1]) : null;
}
