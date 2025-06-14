import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { fabricService } from "../services/fabricService";
import { IJAZAH_STATUS } from "../configs/fabric";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";
import { IjazahInput, Mahasiswa } from "../models/ijazah";
import dotenv from "dotenv";

dotenv.config();

/**
 * Controller for managing Ijazah certificates
 */
export class IjazahController {
  /**
   * Find mahasiswa by NIM
   * GET /api/ijazah/nim/:nim
   * Access: Akademik
   */
  findMahasiswaByNim(req: Request, res: Response): void {
    const { nim } = req.params;
    const result = fabricService.findMahasiswaByNim(nim);
    if (!result) {
      res.status(404).json({
        success: false,
        message: `Mahasiswa dengan NIM ${nim} tidak ditemukan`,
      });
      return;
    }
    res.status(200).json({
      success: true,
      message: `Mahasiswa dengan NIM ${nim} ditemukan`,
      data: result,
    });
    return;
  }

  /**
   * Create new ijazah certificate
   * POST /api/ijazah
   * Access: AKADEMIK only
   */
  async createIjazah(
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

      if (req.user.organization !== Organization.AKADEMIK) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only AKADEMIK organization can create ijazah certificates",
        });
        return;
      }

      // Get fabric token from user session or generate one
      if (!req.fabricToken) {
        res.status(401).json({
          success: false,
          message: "Fabric token required",
        });
        return;
      }

      const ijazahData: IjazahInput = req.body;

      // Get photo file if uploaded
      const photoFile = req.file ? req.file.buffer : undefined;

      logger.info(`Creating ijazah certificate for ${ijazahData.nama}`);

      // Create ijazah using fabric service
      const newIjazah = await fabricService.createIjazah(
        req.user.organization as Organization,
        req.fabricToken,
        ijazahData,
        photoFile
      );

      res.status(201).json({
        success: true,
        message: "Ijazah certificate created successfully",
        data: {
          ...newIjazah,
          certificateUrl: newIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(newIjazah.ipfsCID)
            : null,
          photoUrl: newIjazah.photoPath
            ? `/api/files/photos/${newIjazah.photoPath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in createIjazah controller:", error);

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
   * Update existing ijazah certificate
   * PUT /api/ijazah/:id
   * Access: AKADEMIK only
   */
  async updateIjazah(
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

      if (req.user.organization !== Organization.AKADEMIK) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only AKADEMIK organization can update ijazah certificates",
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
      const ijazahData: Partial<IjazahInput> = req.body;

      // Get photo file if uploaded
      const photoFile = req.file ? req.file.buffer : undefined;

      logger.info(`Updating ijazah certificate with ID: ${id}`);

      // Update ijazah using fabric service
      const updatedIjazah = await fabricService.updateIjazah(
        req.user.organization as Organization,
        req.fabricToken,
        id,
        ijazahData,
        photoFile
      );

      res.status(200).json({
        success: true,
        message: "Ijazah certificate updated successfully",
        data: {
          ...updatedIjazah,
          certificateUrl: updatedIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(updatedIjazah.ipfsCID)
            : null,
          photoUrl: updatedIjazah.photoPath
            ? `/api/files/photos/${updatedIjazah.photoPath}`
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in updateIjazah controller:", error);

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
   * Get ijazah certificate by ID
   * GET /api/ijazah/:id
   * Access: Public (for certificate validation)
   */
  async getIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      logger.info(`Getting ijazah certificate with ID: ${id} (public access)`);

      let userOrganization: Organization;
      let userToken: string;

      // If user is authenticated, use their credentials
      if (req.user && req.fabricToken) {
        userOrganization = req.user.organization as Organization;
        userToken = req.fabricToken;
      } else {
        // For public access, use admin credentials from AKADEMIK organization
        userOrganization = Organization.AKADEMIK;

        // Get admin token for public queries
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "adminpw";

        try {
          const { fabloService } = require("../services/fabloService");
          userToken = await fabloService.enrollUser(
            userOrganization,
            adminUsername,
            adminPassword
          );
        } catch (enrollError) {
          logger.error(
            "Failed to get admin token for public access:",
            enrollError
          );
          res.status(503).json({
            success: false,
            message: "Service temporarily unavailable",
          });
          return;
        }
      }

      const ijazah = await fabricService.getIjazah(
        userOrganization,
        userToken,
        id
      );

      // For public access, provide validation information
      const responseData = {
        ...ijazah,
        certificateUrl: ijazah.ipfsCID
          ? fabricService.getCertificateDownloadUrl(ijazah.ipfsCID)
          : null,
        photoUrl: ijazah.photoPath
          ? `/api/files/photos/${ijazah.photoPath}`
          : null,
        // Add validation metadata for public access
        validation: {
          isValid: ijazah.Status === "aktif",
          status: ijazah.Status,
          issuedDate: ijazah.tanggalIjazahDiberikan,
          lastUpdated: ijazah.UpdatedAt,
          blockchainVerified: true,
        },
      };

      res.status(200).json({
        success: true,
        message: "Ijazah certificate retrieved successfully",
        data: responseData,
        // Indicate if this was accessed publicly
        accessType: req.user ? "authenticated" : "public",
      });
    } catch (error) {
      logger.error("Error in getIjazah controller:", error);

      if (error instanceof Error) {
        // For public access, provide more user-friendly error messages
        if (
          error.message.includes("tidak ditemukan") ||
          error.message.includes("not found")
        ) {
          res.status(404).json({
            success: false,
            message: "Certificate not found. Please verify the certificate ID.",
            validation: {
              isValid: false,
              error: "Certificate not found in blockchain records",
            },
          });
        } else {
          res.status(400).json({
            success: false,
            message: "Unable to validate certificate",
            validation: {
              isValid: false,
              error: error.message,
            },
          });
        }
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
          validation: {
            isValid: false,
            error: "Service temporarily unavailable",
          },
        });
      }
    }
  }

  /**
   * Get all ijazah certificates
   * GET /api/ijazah
   * Access: All authenticated users
   */
  async getAllIjazah(
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

      logger.info("Getting all ijazah certificates");

      const ijazahList = await fabricService.getAllIjazah(
        req.user.organization as Organization,
        req.fabricToken
      );

      // Add download URLs to each ijazah
      const enrichedIjazahList = ijazahList.map((ijazah) => ({
        ...ijazah,
        certificateUrl: ijazah.ipfsCID
          ? fabricService.getCertificateDownloadUrl(ijazah.ipfsCID)
          : null,
        photoUrl: ijazah.photoPath
          ? `/api/files/photos/${ijazah.photoPath}`
          : null,
      }));

      res.status(200).json({
        success: true,
        message: "Ijazah certificates retrieved successfully",
        data: enrichedIjazahList,
        count: enrichedIjazahList.length,
      });
    } catch (error) {
      logger.error("Error in getAllIjazah controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Delete ijazah certificate
   * DELETE /api/ijazah/:id
   * Access: AKADEMIK only
   */
  async deleteIjazah(
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

      if (req.user.organization !== Organization.AKADEMIK) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only AKADEMIK organization can delete ijazah certificates",
        });
        return;
      }

      const { id } = req.params;

      logger.info(`Deleting ijazah certificate with ID: ${id}`);

      const result = await fabricService.deleteIjazah(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      res.status(200).json({
        success: true,
        message: "Ijazah certificate deleted successfully",
        data: result,
      });
    } catch (error) {
      logger.error("Error in deleteIjazah controller:", error);

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
   * Get photo download URL for student photo
   * GET /api/ijazah/:id/photo
   * Access: All authenticated users
   */
  async getPhotoUrl(
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

      // Get ijazah data first
      const ijazah = await fabricService.getIjazah(
        req.user.organization as Organization,
        req.fabricToken,
        id
      );

      if (!ijazah.photoPath) {
        res.status(404).json({
          success: false,
          message: "Student photo not found",
        });
        return;
      }

      const photoUrl = `/api/files/photos/${ijazah.photoPath}`;

      res.status(200).json({
        success: true,
        message: "Photo URL retrieved successfully",
        data: {
          url: photoUrl,
          photoPath: ijazah.photoPath,
        },
      });
    } catch (error) {
      logger.error("Error in getPhotoUrl controller:", error);

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
}

// Export controller instance
export const ijazahController = new IjazahController();
