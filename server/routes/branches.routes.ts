import { Router } from "express";

import * as branchesController from "../controllers/branches.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const branchRoutes = Router();

branchRoutes.use(requireAuth);
branchRoutes.get("/", branchesController.list);
branchRoutes.post("/", requireAdmin, branchesController.create);
branchRoutes.patch("/:id", requireAdmin, branchesController.update);
