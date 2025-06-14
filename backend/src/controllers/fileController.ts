import { Request, Response } from "express";
import { fileStorageService } from "../services/fileStorageService";
import { logger } from "../utils/logger";
import fs from "fs/promises";

function isInvalidFilename(filename: string): boolean {
  return (
    !filename ||
    filename.includes("..") ||
    filename.includes("/") ||
    filename.includes("\\")
  );
}

export const getPhoto = async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;
    if (isInvalidFilename(filename)) {
      res.status(400).json({ success: false, message: "Invalid filename" });
      return;
    }

    const exists = await fileStorageService.photoExists(filename);
    if (!exists) {
      res.status(404).json({ success: false, message: "Photo not found" });
      return;
    }

    const photoBuffer = await fileStorageService.getPhoto(filename);

    res.set({
      "Content-Type": "image/png",
      "Content-Length": photoBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000",
      ETag: `"${filename}"`,
    });
    res.send(photoBuffer);
    logger.info(`Photo served: ${filename}`);
    return;
  } catch (error) {
    logger.error(`Error serving photo ${req.params.filename}:`, error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve photo" });
  }
};

export const getSignature = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { filename } = req.params;
    if (isInvalidFilename(filename)) {
      res.status(400).json({ success: false, message: "Invalid filename" });
      return;
    }

    const exists = await fileStorageService.signatureExists(filename);
    if (!exists) {
      res.status(404).json({ success: false, message: "Signature not found" });
      return;
    }

    const signatureBuffer = await fileStorageService.getSignature(filename);

    res.set({
      "Content-Type": "image/png",
      "Content-Length": signatureBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000",
      ETag: `"${filename}"`,
    });
    res.send(signatureBuffer);
    logger.info(`Signature served: ${filename}`);
    return;
  } catch (error) {
    logger.error(`Error serving signature ${req.params.filename}:`, error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve signature" });
  }
};

export const getFileInfo = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { type, filename } = req.params;

    if (
      !["photos", "signatures"].includes(type) ||
      isInvalidFilename(filename)
    ) {
      res.status(400).json({ success: false, message: "Invalid input" });
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
      res
        .status(404)
        .json({ success: false, message: `${type.slice(0, -1)} not found` });
      return;
    }

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
    return;
  } catch (error) {
    logger.error("Error getting file info:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to retrieve file info" });
  }
};

export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "admin") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const stats = await fileStorageService.getStorageStats();

    const totalSize = stats.photos.totalSize + stats.signatures.totalSize;
    res.json({
      success: true,
      message: "Storage statistics retrieved successfully",
      data: {
        ...stats,
        totalFiles: stats.photos.count + stats.signatures.count,
        totalSize,
        formattedSizes: {
          photos: formatBytes(stats.photos.totalSize),
          signatures: formatBytes(stats.signatures.totalSize),
          total: formatBytes(totalSize),
        },
      },
    });
    return;
  } catch (error) {
    logger.error("Error getting storage stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve storage statistics",
    });
  }
};

export const healthCheck = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    return;
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
};

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}
