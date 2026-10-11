import type { IncomingMessage, ServerResponse } from "node:http";

import { createApp } from "../server/app";

/**
 * Vercel serverless entry point (see vercel.json).
 *
 * Vercel routes /api/* here through a rewrite that appends the original
 * sub-path as `__api_path`, so this handler always reconstructs the real
 * `/api/v1/...` URL before handing the request to the Express app — no
 * matter whether the platform preserves or masks the path internally.
 */
const app = createApp();

export default function handler(
  req: IncomingMessage,
  res: ServerResponse,
): void {
  const rawUrl = req.url ?? "/";
  const queryIndex = rawUrl.indexOf("?");
  const queryString = queryIndex >= 0 ? rawUrl.slice(queryIndex + 1) : "";
  const params = new URLSearchParams(queryString);
  const originalPath = params.get("__api_path");

  if (originalPath !== null) {
    params.delete("__api_path");
    const query = params.toString();
    req.url = `/api/${originalPath}${query ? `?${query}` : ""}`;
  }

  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(
    req,
    res,
  );
}
