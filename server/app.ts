import { existsSync } from "node:fs";
import path from "node:path";

import express from "express";
import type { Express, NextFunction, Request, Response } from "express";

import { errorHandler, notFoundHandler } from "./middleware/error";
import { apiRouter } from "./routes";

export function createApp(): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json());

  app.use("/api/v1", apiRouter);
  app.use("/api", notFoundHandler);

  // Production: serve the built SPA from dist/ with a history fallback.
  const distDir = path.resolve(process.cwd(), "dist");
  if (existsSync(distDir)) {
    app.use(express.static(distDir));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET" || req.path.startsWith("/api")) {
        next();
        return;
      }
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.use(errorHandler);
  return app;
}
