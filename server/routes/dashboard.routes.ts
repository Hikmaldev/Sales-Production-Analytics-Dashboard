import { Router } from "express";

import * as dashboardController from "../controllers/dashboard.controller";
import { requireAuth } from "../middleware/auth";

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);
dashboardRoutes.get("/summary", dashboardController.getSummary);
dashboardRoutes.get("/trend", dashboardController.getTrend);
dashboardRoutes.get("/branch-comparison", dashboardController.getBranchComparison);
dashboardRoutes.get("/category-comparison", dashboardController.getCategoryComparison);
