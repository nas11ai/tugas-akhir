import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { fabricService } from "../services/fabricService";
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
        data: newSignature,
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

      // Update signature using fabric service
      const updatedSignature = await fabricService.updateSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id,
        signatureData
      );

      res.status(200).json({
        success: true,
        message: "Signature updated successfully",
        data: updatedSignature,
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

      res.status(200).json({
        success: true,
        message: "Signature retrieved successfully",
        data: signature,
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

      res.status(200).json({
        success: true,
        message: "Signatures retrieved successfully",
        data: signatures,
        count: signatures.length,
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
        data: activeSignature,
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
        data: activeSignature,
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
   * Deactivate signature
   * PUT /api/signature/:id/deactivate
   * Access: REKTOR only
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

      // Update signature to set IsActive to false
      const updatedSignature = await fabricService.updateSignature(
        req.user.organization as Organization,
        req.fabricToken,
        id,
        { IsActive: false }
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
   * Upload signature file and create signature record
   * POST /api/signature/upload
   * Access: REKTOR only
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

      // Upload signature file to IPFS
      const { ipfsClusterService } = require("../services/ipfsClusterService");
      const signatureResult = await ipfsClusterService.add(req.file.buffer, {
        filename: `signature_${ID}.${req.file.originalname.split(".").pop()}`,
        local: false,
      });

      // Pin the signature file
      await ipfsClusterService.pin(signatureResult.cid);
      logger.info(
        `Signature file uploaded and pinned with CID: ${signatureResult.cid}`
      );

      // Create signature record in blockchain
      const signatureData: SignatureInput = {
        ID,
        URL: signatureResult.url,
        IsActive: IsActive === "true" || IsActive === true,
      };

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
          ipfsCID: signatureResult.cid,
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

      const stats = {
        total: totalSignatures,
        active: activeSignatures,
        inactive: inactiveSignatures,
        signatures: signatures.map((sig) => ({
          ID: sig.ID,
          IsActive: sig.IsActive,
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
   * Validate signature URL accessibility
   * POST /api/signature/validate-url
   * Access: REKTOR only
   */
  async validateSignatureUrl(
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

      const { url } = req.body;

      if (!url) {
        res.status(400).json({
          success: false,
          message: "URL is required",
        });
        return;
      }

      logger.info(`Validating signature URL: ${url}`);

      // Basic URL validation
      try {
        new URL(url);
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "Invalid URL format",
        });
        return;
      }

      // Try to fetch the URL to check accessibility
      const fetch = require("node-fetch");
      try {
        const response = await fetch(url, { method: "HEAD", timeout: 10000 });

        if (response.ok) {
          res.status(200).json({
            success: true,
            message: "Signature URL is valid and accessible",
            data: {
              url,
              status: response.status,
              accessible: true,
            },
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Signature URL is not accessible",
            data: {
              url,
              status: response.status,
              accessible: false,
            },
          });
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "Failed to access signature URL",
          data: {
            url,
            accessible: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
    } catch (error) {
      logger.error("Error in validateSignatureUrl controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

// Export controller instance
export const signatureController = new SignatureController();
