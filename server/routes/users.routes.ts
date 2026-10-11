import { Router } from "express";

import * as usersController from "../controllers/users.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

export const userRoutes = Router();

userRoutes.use(requireAuth, requireAdmin);
userRoutes.get("/", usersController.list);
userRoutes.post("/", usersController.create);
