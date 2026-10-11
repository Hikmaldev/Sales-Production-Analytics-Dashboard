import { Router } from "express";

import * as categoriesController from "../controllers/categories.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const categoryRoutes = Router();

categoryRoutes.use(requireAuth);
categoryRoutes.get("/", categoriesController.list);
categoryRoutes.post("/", requireAdmin, categoriesController.create);
categoryRoutes.patch("/:id", requireAdmin, categoriesController.update);
