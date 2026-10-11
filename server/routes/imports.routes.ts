import { Router } from "express";
import multer from "multer";

import * as importsController from "../controllers/imports.controller";
import { requireAdmin, requireAuth } from "../middleware/auth";

const upload = multer({
  storage: multer.memoryStorage(),
  // 4 MB keeps the upload inside Vercel's serverless request-body limit.
  limits: { fileSize: 4 * 1024 * 1024, files: 1 },
});

export const importsRoutes = Router();

importsRoutes.use(requireAuth, requireAdmin);
importsRoutes.post(
  "/records",
  upload.single("file"),
  importsController.importRecords,
);
importsRoutes.get("/template.csv", importsController.downloadTemplate);
