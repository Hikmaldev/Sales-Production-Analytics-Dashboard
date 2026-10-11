import { Router } from "express";

import * as exportsController from "../controllers/exports.controller";
import { requireAuth } from "../middleware/auth";

export const exportRoutes = Router();

exportRoutes.use(requireAuth);
exportRoutes.post("/pdf", exportsController.exportPdf);
exportRoutes.post("/excel", exportsController.exportExcel);
exportRoutes.get("/logs", exportsController.listLogs);
