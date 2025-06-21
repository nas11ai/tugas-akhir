import { Router } from "express";
import { authenticate, requireOrganization } from "../middlewares/auth";
import { Organization } from "../models/user";
import {
  getPhoto,
  getSignature,
  getFileInfo,
  getStats,
  healthCheck,
} from "../controllers/fileController";
import expressListRoutes from "express-list-routes";

const router = Router();

/**
 * Get photo file
 * GET /api/files/photos/:filename
 * Access: Public (for displaying in frontend)
 */
router.get("/photos/:filename", getPhoto);

/**
 * Get signature file
 * GET /api/files/signatures/:filename
 * Access: Public (for displaying in frontend)
 */
router.get("/signatures/:filename", getSignature);

/**
 * Get file info (metadata without downloading)
 * GET /api/files/info/:type/:filename
 * Access: Authenticated users only
 */
router.get(
  "/info/:type/:filename",
  authenticate,
  requireOrganization([Organization.AKADEMIK]),
  getFileInfo
);

/**
 * Get storage statistics
 * GET /api/files/stats
 * Access: Admin only
 */
router.get(
  "/stats",
  authenticate,
  requireOrganization([Organization.AKADEMIK]),
  getStats
);

/**
 * Health check for file storage
 * GET /api/files/health
 * Access: Public
 */
router.get(
  "/health",
  authenticate,
  requireOrganization([Organization.AKADEMIK]),
  healthCheck
);

expressListRoutes(router, {
  prefix: "/api/files",
});

export default router;
