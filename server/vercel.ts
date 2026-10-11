import type { IncomingMessage, ServerResponse } from "node:http";

type ExpressHandler = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * Vercel serverless entry point.
 *
 * Bundled to api/index.js by `npm run build:api` (esbuild) because Vercel
 * does not compile TypeScript sources outside the api/ directory. npm
 * packages stay external and are traced by Vercel at build time.
 *
 * Vercel routes /api/* here through a rewrite that appends the original
 * sub-path as `__api_path`, so this handler reconstructs the real
 * `/api/v1/...` URL before handing the request to the Express app.
 *
 * The app is created lazily so an initialization failure returns a readable
 * JSON error instead of an opaque FUNCTION_INVOCATION_FAILED.
 */
let app: ExpressHandler | null = null;
let initError: string | null = null;
let initialized = false;

async function initialize(): Promise<void> {
  if (initialized) return;
  initialized = true;

  try {
    const { createApp } = await import("./app");
    app = createApp() as unknown as ExpressHandler;
  } catch (error) {
    initError = error instanceof Error ? error.message : String(error);
    console.error("API initialization failed:", error);
  }
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  await initialize();

  if (!app) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(
      JSON.stringify({ error: "api_initialization_failed", message: initError }),
    );
    return;
  }

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

  app(req, res);
}
