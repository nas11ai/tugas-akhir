import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { fabricService } from "../services/fabricService";
import { fileStorageService } from "../services/fileStorageService";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";
import { SignatureInput } from "../models/ijazah";

/**
 * Controller for managing Rector signatures
 */
export class SignatureController {
  /**
   * Create new signature
   * POST /api/signature
   * Access: REKTOR only
   */
  async createSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        });
        return;
      }

      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      const signatureData: SignatureInput = req.body;

      logger.info(`Creating signature with ID: ${signatureData.ID}`);

      // Create signature using fabric service
      const newSignature = await fabricService.createSignature(
        req.user.organization as Organization,
        req.fabricToken,
        signatureData
      );

      res.status(201).json({
        success: true,
        message: "Signature created successfully",
        data: {
          ...newSignature,
          signatureUrl: newSignature.filePath
            ? `/api/files/signatures/${newSignature.filePath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in createSignature controller:", error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Update existing signature
   * PUT /api/signature/:id
   * Access: REKTOR only
   */
  async updateSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({
          success: false,
          message: "Validation error",
          errors: errors.array(),
        });
        return;
      }

      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      const { id } = req.params;
      const signatureData: Partial<SignatureInput> = req.body;

      logger.info(`Updating signature with ID: ${id}`);

      const existingSignature = await fabricService.getSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      if (!existingSignature) {
        res.status(404).json({
          success: false,
          message: "Signature not found",
        });
        return;
      }

      // Update signature using fabric service
      const updatedSignature = await fabricService.updateSignature(
        req.user.organization as Organization,
        req.fabricToken,
        existingSignature.ID,
        signatureData
      );

      res.status(200).json({
        success: true,
        message: "Signature updated successfully",
        data: {
          ...updatedSignature,
          signatureUrl: updatedSignature.filePath
            ? `/api/files/signatures/${updatedSignature.filePath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in updateSignature controller:", error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Get signature by ID
   * GET /api/signature/:id
   * Access: All authenticated users
   */
  async getSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { id } = req.params;

      logger.info(`Getting signature with ID: ${id}`);

      const signature = await fabricService.getSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      if (!signature) {
        res.status(404).json({
          success: false,
          message: "Signature not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Signature retrieved successfully",
        data: {
          ...signature,
          signatureUrl: signature.filePath
            ? `/api/files/signatures/${signature.filePath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in getSignature controller:", error);

      if (error instanceof Error) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Get all signatures
   * GET /api/signature
   * Access: All authenticated users
   */
  async getAllSignatures(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      logger.info("Getting all signatures");

      const signatures = await fabricService.getAllSignatures(
        req.user.organization as Organization,
        req.fabricToken
      );

      // Add signature URLs to each signature
      const enrichedSignatures = signatures.map((signature) => ({
        ...signature,
        signatureUrl: signature.filePath
          ? `/api/files/signatures/${signature.filePath}`
          : null,
      }));

      res.status(200).json({
        success: true,
        message: "Signatures retrieved successfully",
        data: enrichedSignatures,
        count: enrichedSignatures.length,
      });
    } catch (error) {
      logger.error("Error in getAllSignatures controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get active signature
   * GET /api/signature/active
   * Access: All authenticated users
   */
  async getActiveSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      logger.info("Getting active signature");

      const activeSignature = await fabricService.getActiveSignature(
        req.user.organization as Organization,
        req.fabricToken
      );

      res.status(200).json({
        success: true,
        message: "Active signature retrieved successfully",
        data: {
          ...activeSignature,
          signatureUrl: activeSignature.filePath
            ? `/api/files/signatures/${activeSignature.filePath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in getActiveSignature controller:", error);

      if (error instanceof Error) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Upload signature file and create signature record
   * POST /api/signature/upload
   */
  async uploadSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      // Check if file is uploaded
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: "Signature file is required",
        });
        return;
      }

      // Get signature metadata from request body
      const { ID, IsActive } = req.body;

      if (!ID) {
        res.status(400).json({
          success: false,
          message: "Signature ID is required",
        });
        return;
      }

      logger.info(`Uploading signature file for ID: ${ID}`);

      // Generate filename for signature
      const signatureFileName = fileStorageService.generateFileName(
        `signature_${ID}`,
        req.file.originalname
      );

      // Save signature file to local storage
      const filePath = await fileStorageService.saveSignature(
        req.file.buffer,
        signatureFileName
      );

      logger.info(`Signature file saved with filename: ${filePath}`);

      // Create signature record in blockchain
      const signatureData: SignatureInput = {
        ID,
        filePath,
        IsActive: IsActive === "true" || IsActive === true,
      };

      // Check if signature already exists
      const existingSignature = await fabricService.getSignature(
        req.user.organization as Organization,
        req.fabricToken,
        ID
      );

      if (existingSignature) {
        // Delete old signature file if it exists
        if (existingSignature.filePath) {
          await fileStorageService.deleteSignature(existingSignature.filePath);
        }

        const updatedSignature = await fabricService.updateSignature(
          req.user.organization as Organization,
          req.fabricToken,
          ID,
          signatureData
        );

        res.status(200).json({
          success: true,
          message: "Signature uploaded and updated successfully",
          data: {
            ...updatedSignature,
            signatureUrl: `/api/files/signatures/${filePath}`,
          },
        });
        return;
      }

      const newSignature = await fabricService.createSignature(
        req.user.organization as Organization,
        req.fabricToken,
        signatureData
      );

      res.status(201).json({
        success: true,
        message: "Signature uploaded and created successfully",
        data: {
          ...newSignature,
          signatureUrl: `/api/files/signatures/${filePath}`,
        },
      });
    } catch (error) {
      logger.error("Error in uploadSignature controller:", error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Set active signature
   * PUT /api/signature/:id/activate
   * Access: REKTOR only
   */
  async setActiveSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      const { id } = req.params;

      logger.info(`Setting signature ${id} as active`);

      const activeSignature = await fabricService.setActiveSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      res.status(200).json({
        success: true,
        message: "Signature set as active successfully",
        data: {
          ...activeSignature,
          signatureUrl: activeSignature.filePath
            ? `/api/files/signatures/${activeSignature.filePath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in setActiveSignature controller:", error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Delete signature
   * DELETE /api/signature/:id
   * Access: REKTOR only
   */
  async deleteSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      const { id } = req.params;

      logger.info(`Deleting signature with ID: ${id}`);

      const result = await fabricService.deleteSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      res.status(200).json({
        success: true,
        message: "Signature deleted successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error in deleteSignature controller:", error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Get signature URL
   * GET /api/signature/:id/url
   * Access: All authenticated users
   */
  async getSignatureUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { id } = req.params;

      // Get signature data first
      const signature = await fabricService.getSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      if (!signature) {
        res.status(404).json({
          success: false,
          message: "Signature not found",
        });
        return;
      }

      if (!signature.filePath) {
        res.status(404).json({
          success: false,
          message: "Signature file not found",
        });
        return;
      }

      const signatureUrl = `/api/files/signatures/${signature.filePath}`;

      res.status(200).json({
        success: true,
        message: "Signature URL retrieved successfully",
        data: {
          url: signatureUrl,
          filePath: signature.filePath,
          signatureId: signature.ID,
          isActive: signature.IsActive,
        },
      });
    } catch (error) {
      logger.error("Error in getSignatureUrl controller:", error);

      if (error instanceof Error) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }

  /**
   * Get signature usage statistics
   * GET /api/signature/stats
   * Access: REKTOR only
   */
  async getSignatureStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      logger.info("Getting signature statistics");

      // Get all signatures
      const signatures = await fabricService.getAllSignatures(
        req.user.organization as Organization,
        req.fabricToken
      );

      // Calculate statistics
      const totalSignatures = signatures.length;
      const activeSignatures = signatures.filter((sig) => sig.IsActive).length;
      const inactiveSignatures = totalSignatures - activeSignatures;

      // Get storage stats for signatures
      const storageStats = await fileStorageService.getStorageStats();

      const stats = {
        total: totalSignatures,
        active: activeSignatures,
        inactive: inactiveSignatures,
        storageInfo: {
          fileCount: storageStats.signatures.count,
          totalSize: storageStats.signatures.totalSize,
          formattedSize: formatBytes(storageStats.signatures.totalSize),
        },
        signatures: signatures.map((sig) => ({
          ID: sig.ID,
          IsActive: sig.IsActive,
          filePath: sig.filePath,
          signatureUrl: sig.filePath
            ? `/api/files/signatures/${sig.filePath}`
            : null,
          CreatedAt: sig.CreatedAt,
          UpdatedAt: sig.UpdatedAt,
        })),
      };

      res.status(200).json({
        success: true,
        message: "Signature statistics retrieved successfully",
        data: stats,
      });
    } catch (error) {
      logger.error("Error in getSignatureStats controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Deactivate signature
   * PUT /api/signature/:id/deactivate
   */
  async deactivateSignature(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      // Check user authentication and organization
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      const { id } = req.params;

      logger.info(`Deactivating signature with ID: ${id}`);

      // Check if signature exists
      const signature = await fabricService.getSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      if (!signature) {
        res.status(404).json({
          success: false,
          message: "Signature not found",
        });
        return;
      }

      // Update signature to set IsActive to false
      const updatedSignature = await fabricService.updateSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id,
        {
          ID: signature.ID,
          filePath: signature.filePath,
          IsActive: false,
        }
      );

      res.status(200).json({
        success: true,
        message: "Signature deactivated successfully",
        data: updatedSignature,
      });
    } catch (error) {
      logger.error("Error in deactivateSignature controller:", error);

      if (error instanceof Error) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  }
}

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

// Export controller instance
export const signatureController = new SignatureController();
