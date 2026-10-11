import { Router } from "express";

import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";

export const authRoutes = Router();

authRoutes.post("/login", authController.login);
authRoutes.get("/me", requireAuth, authController.me);
authRoutes.post("/logout", requireAuth, authController.logout);
