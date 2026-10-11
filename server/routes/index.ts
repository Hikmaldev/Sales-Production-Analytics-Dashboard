import { Router } from "express";

import { adminRoutes } from "./admin.routes";
import { authRoutes } from "./auth.routes";
import { branchRoutes } from "./branches.routes";
import { categoryRoutes } from "./categories.routes";
import { dashboardRoutes } from "./dashboard.routes";
import { exportRoutes } from "./exports.routes";
import { importsRoutes } from "./imports.routes";
import { userRoutes } from "./users.routes";

/** All API routes are mounted under /api/v1 (see api-endpoints doc). */
export const apiRouter = Router();

apiRouter.use(authRoutes); // POST /login, GET /me, POST /logout
apiRouter.use("/dashboard", dashboardRoutes);
apiRouter.use("/branches", branchRoutes);
apiRouter.use("/product-categories", categoryRoutes);
apiRouter.use("/users", userRoutes);
apiRouter.use("/exports", exportRoutes);
apiRouter.use("/admin", adminRoutes);
apiRouter.use("/admin/imports", importsRoutes);
