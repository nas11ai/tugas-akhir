import { Router, Request, Response } from "express";
import { fileStorageService } from "../services/fileStorageService";
import { logger } from "../utils/logger";

const router = Router();

/**
 * Get photo file
 * GET /api/files/photos/:filename
 * Access: Public (for displaying in frontend)
 */
router.get(
  "/photos/:filename",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;

      // Validate filename to prevent directory traversal
      if (
        !filename ||
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid filename",
        });
        return;
      }

      // Check if photo exists
      const exists = await fileStorageService.photoExists(filename);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: "Photo not found",
        });
        return;
      }

      // Get photo buffer
      const photoBuffer = await fileStorageService.getPhoto(filename);

      // Set appropriate headers
      res.set({
        "Content-Type": "image/png",
        "Content-Length": photoBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        ETag: `"${filename}"`,
      });

      // Send the file
      res.send(photoBuffer);

      logger.info(`Photo served: ${filename}`);
    } catch (error) {
      logger.error(`Error serving photo ${req.params.filename}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve photo",
      });
    }
  }
);

/**
 * Get signature file
 * GET /api/files/signatures/:filename
 * Access: Public (for displaying in frontend)
 */
router.get(
  "/signatures/:filename",
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;

      // Validate filename to prevent directory traversal
      if (
        !filename ||
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid filename",
        });
        return;
      }

      // Check if signature exists
      const exists = await fileStorageService.signatureExists(filename);
      if (!exists) {
        res.status(404).json({
          success: false,
          message: "Signature not found",
        });
        return;
      }

      // Get signature buffer
      const signatureBuffer = await fileStorageService.getSignature(filename);

      // Set appropriate headers
      res.set({
        "Content-Type": "image/png",
        "Content-Length": signatureBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000", // Cache for 1 year
        ETag: `"${filename}"`,
      });

      // Send the file
      res.send(signatureBuffer);

      logger.info(`Signature served: ${filename}`);
    } catch (error) {
      logger.error(`Error serving signature ${req.params.filename}:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve signature",
      });
    }
  }
);

/**
 * Get file info (metadata without downloading)
 * GET /api/files/info/:type/:filename
 * Access: Authenticated users only
 */
router.get(
  "/info/:type/:filename",
  async (req: Request, res: Response): Promise<void> => {
    try {
      // Basic authentication check (you might want to add proper auth middleware)
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { type, filename } = req.params;

      if (!["photos", "signatures"].includes(type)) {
        res.status(400).json({
          success: false,
          message: "Invalid file type. Must be 'photos' or 'signatures'",
        });
        return;
      }

      // Validate filename
      if (
        !filename ||
        filename.includes("..") ||
        filename.includes("/") ||
        filename.includes("\\")
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid filename",
        });
        return;
      }

      let exists = false;
      let filePath = "";

      if (type === "photos") {
        exists = await fileStorageService.photoExists(filename);
        filePath = fileStorageService.getPhotoPath(filename);
      } else {
        exists = await fileStorageService.signatureExists(filename);
        filePath = fileStorageService.getSignaturePath(filename);
      }

      if (!exists) {
        res.status(404).json({
          success: false,
          message: `${type.slice(0, -1)} not found`,
        });
        return;
      }

      // Get file stats
      const fs = require("fs/promises");
      const stats = await fs.stat(filePath);

      res.json({
        success: true,
        message: "File info retrieved successfully",
        data: {
          filename,
          type,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          url: `/api/files/${type}/${filename}`,
        },
      });
    } catch (error) {
      logger.error(`Error getting file info:`, error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve file info",
      });
    }
  }
);

/**
 * Get storage statistics
 * GET /api/files/stats
 * Access: Admin only
 */
router.get("/stats", async (req: Request, res: Response): Promise<void> => {
  try {
    // Check admin access (you might want to add proper admin middleware)
    if (!req.user || req.user.role !== "admin") {
      res.status(403).json({
        success: false,
        message: "Admin access required",
      });
      return;
    }

    const stats = await fileStorageService.getStorageStats();

    res.json({
      success: true,
      message: "Storage statistics retrieved successfully",
      data: {
        ...stats,
        totalFiles: stats.photos.count + stats.signatures.count,
        totalSize: stats.photos.totalSize + stats.signatures.totalSize,
        formattedSizes: {
          photos: formatBytes(stats.photos.totalSize),
          signatures: formatBytes(stats.signatures.totalSize),
          total: formatBytes(
            stats.photos.totalSize + stats.signatures.totalSize
          ),
        },
      },
    });
  } catch (error) {
    logger.error("Error getting storage stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve storage statistics",
    });
  }
});

/**
 * Health check for file storage
 * GET /api/files/health
 * Access: Public
 */
router.get("/health", async (req: Request, res: Response): Promise<void> => {
  try {
    const stats = await fileStorageService.getStorageStats();

    res.json({
      success: true,
      message: "File storage is healthy",
      data: {
        status: "healthy",
        photosDir: stats.photos.count > 0 ? "accessible" : "empty",
        signaturesDir: stats.signatures.count > 0 ? "accessible" : "empty",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("File storage health check failed:", error);
    res.status(503).json({
      success: false,
      message: "File storage is unhealthy",
      data: {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Helper function to format bytes
 */
function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export default router;
