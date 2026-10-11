import { Router } from "express";

import * as syncController from "../controllers/sync.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const adminRoutes = Router();

adminRoutes.use(requireAuth, requireAdmin);
adminRoutes.get("/sync-status", syncController.getStatus);
adminRoutes.get("/sync-runs", syncController.listRuns);
adminRoutes.post("/sync-trigger", syncController.trigger);
