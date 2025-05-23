import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import { fabricService } from "../services/fabricService";
import { IJAZAH_STATUS } from "../config/fabric";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";
import { IjazahInput } from "../models/ijazah";
import dotenv from "dotenv";

dotenv.config();

/**
 * Controller for managing Ijazah certificates
 */
export class IjazahController {
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
      if (!req.token) {
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
        req.user.organization,
        req.token,
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
          photoUrl: newIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(newIjazah.photoCID)
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
   * Access: AKADEMIK only (cannot update if status is "menunggu tanda tangan rektor")
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

      if (!req.token) {
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
        req.user.organization,
        req.token,
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
          photoUrl: updatedIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(updatedIjazah.photoCID)
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
      const { fabloService } = require("../services/fabloService");

      logger.info(`Getting ijazah certificate with ID: ${id} (public access)`);

      let userOrganization: Organization;
      let userToken: string;

      // If user is authenticated, use their credentials
      if (req.user && req.token) {
        userOrganization = req.user.organization;
        userToken = req.token;
      } else {
        // For public access, use admin credentials from AKADEMIK organization
        userOrganization = Organization.AKADEMIK;

        // Get admin token for public queries
        const adminUsername = process.env.ADMIN_USERNAME || "admin";
        const adminPassword = process.env.ADMIN_PASSWORD || "adminpw";

        try {
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
        photoUrl: ijazah.photoCID
          ? fabricService.getPhotoDownloadUrl(ijazah.photoCID)
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
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      logger.info("Getting all ijazah certificates");

      const ijazahList = await fabricService.getAllIjazah(
        req.user.organization,
        req.token
      );

      // Add download URLs to each ijazah
      const enrichedIjazahList = ijazahList.map((ijazah) => ({
        ...ijazah,
        certificateUrl: ijazah.ipfsCID
          ? fabricService.getCertificateDownloadUrl(ijazah.ipfsCID)
          : null,
        photoUrl: ijazah.photoCID
          ? fabricService.getPhotoDownloadUrl(ijazah.photoCID)
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
   * Get ijazah certificates by status
   * GET /api/ijazah/status/:status
   * Access: All authenticated users
   */
  async getIjazahByStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { status } = req.params;

      // Validate status
      const validStatuses = Object.values(IJAZAH_STATUS);
      if (!validStatuses.includes(status as any)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(
            ", "
          )}`,
        });
        return;
      }

      logger.info(`Getting ijazah certificates with status: ${status}`);

      const ijazahList = await fabricService.getIjazahByStatus(
        req.user.organization,
        req.token,
        status
      );

      // Add download URLs to each ijazah
      const enrichedIjazahList = ijazahList.map((ijazah) => ({
        ...ijazah,
        certificateUrl: ijazah.ipfsCID
          ? fabricService.getCertificateDownloadUrl(ijazah.ipfsCID)
          : null,
        photoUrl: ijazah.photoCID
          ? fabricService.getPhotoDownloadUrl(ijazah.photoCID)
          : null,
      }));

      res.status(200).json({
        success: true,
        message: `Ijazah certificates with status '${status}' retrieved successfully`,
        data: enrichedIjazahList,
        count: enrichedIjazahList.length,
      });
    } catch (error) {
      logger.error("Error in getIjazahByStatus controller:", error);

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
   * Update ijazah status
   * PUT /api/ijazah/:id/status
   * Access: REKTOR only (for approval/rejection), AKADEMIK for other status changes
   */
  async updateIjazahStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          message: "Status is required",
        });
        return;
      }

      // Validate status
      const validStatuses = Object.values(IJAZAH_STATUS);
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(
            ", "
          )}`,
        });
        return;
      }

      // Check organization access for approval/rejection
      if (
        (status === IJAZAH_STATUS.DISETUJUI ||
          status === IJAZAH_STATUS.DITOLAK) &&
        req.user.organization !== Organization.REKTOR
      ) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can approve or reject ijazah certificates",
        });
        return;
      }

      logger.info(`Updating ijazah status to ${status} for ID: ${id}`);

      const updatedIjazah = await fabricService.updateIjazahStatus(
        req.user.organization,
        req.token,
        id,
        status
      );

      res.status(200).json({
        success: true,
        message: `Ijazah status updated to '${status}' successfully`,
        data: {
          ...updatedIjazah,
          certificateUrl: updatedIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(updatedIjazah.ipfsCID)
            : null,
          photoUrl: updatedIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(updatedIjazah.photoCID)
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in updateIjazahStatus controller:", error);

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
      if (!req.user || !req.token) {
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
        req.user.organization,
        req.token,
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
   * Get download URL for certificate PDF
   * GET /api/ijazah/:id/certificate
   * Access: All authenticated users
   */
  async getCertificateDownloadUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { id } = req.params;

      // Get ijazah data first
      const ijazah = await fabricService.getIjazah(
        req.user.organization,
        req.token,
        id
      );

      if (!ijazah.ipfsCID) {
        res.status(404).json({
          success: false,
          message: "Certificate PDF not found",
        });
        return;
      }

      const downloadUrl = fabricService.getCertificateDownloadUrl(
        ijazah.ipfsCID
      );

      res.status(200).json({
        success: true,
        message: "Certificate download URL retrieved successfully",
        data: {
          url: downloadUrl,
          ipfsCID: ijazah.ipfsCID,
        },
      });
    } catch (error) {
      logger.error("Error in getCertificateDownloadUrl controller:", error);

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
   * Get download URL for student photo
   * GET /api/ijazah/:id/photo
   * Access: All authenticated users
   */
  async getPhotoDownloadUrl(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const { id } = req.params;

      // Get ijazah data first
      const ijazah = await fabricService.getIjazah(
        req.user.organization,
        req.token,
        id
      );

      if (!ijazah.photoCID) {
        res.status(404).json({
          success: false,
          message: "Student photo not found",
        });
        return;
      }

      const downloadUrl = fabricService.getPhotoDownloadUrl(ijazah.photoCID);

      res.status(200).json({
        success: true,
        message: "Photo download URL retrieved successfully",
        data: {
          url: downloadUrl,
          photoCID: ijazah.photoCID,
        },
      });
    } catch (error) {
      logger.error("Error in getPhotoDownloadUrl controller:", error);

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
   * Validate ijazah certificate for public verification
   * GET /api/ijazah/:id/validate
   * Access: Public (no authentication required)
   */
  async validateIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { fabloService } = require("../services/fabloService");

      logger.info(`Public validation request for ijazah ID: ${id}`);

      // Use admin credentials for public validation
      const userOrganization = Organization.AKADEMIK;
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "adminpw";

      let userToken: string;
      try {
        userToken = await fabloService.enrollUser(
          userOrganization,
          adminUsername,
          adminPassword
        );
      } catch (enrollError) {
        logger.error("Failed to get admin token for validation:", enrollError);
        res.status(503).json({
          success: false,
          message: "Validation service temporarily unavailable",
          validation: {
            isValid: false,
            error: "Unable to connect to verification service",
          },
        });
        return;
      }

      try {
        const ijazah = await fabricService.getIjazah(
          userOrganization,
          userToken,
          id
        );

        // Prepare public validation response (limited information)
        const validationData = {
          certificateId: ijazah.ID,
          holderName: ijazah.nama,
          program: ijazah.programStudi,
          faculty: ijazah.fakultas,
          graduationDate: ijazah.tanggalLulus,
          degree: ijazah.gelarPendidikan,
          documentNumber: ijazah.nomorDokumen,
          nationalCertificateNumber: ijazah.nomorIjazahNasional,
          issuedDate: ijazah.tanggalIjazahDiberikan,
          issuedPlace: ijazah.tempatIjazahDiberikan,
          accreditation: ijazah.akreditasiProgramStudi,
          status: ijazah.Status,
          lastUpdated: ijazah.UpdatedAt,
          validation: {
            isValid: ijazah.Status === "aktif",
            isAuthentic: true, // Verified from blockchain
            status: ijazah.Status,
            blockchainVerified: true,
            verificationTimestamp: new Date().toISOString(),
          },
        };

        res.status(200).json({
          success: true,
          message: "Certificate validation completed",
          data: validationData,
        });
      } catch (notFoundError) {
        // Certificate not found
        res.status(404).json({
          success: false,
          message: "Certificate not found",
          validation: {
            isValid: false,
            isAuthentic: false,
            error: "Certificate ID not found in official records",
            verificationTimestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      logger.error("Error in validateIjazah controller:", error);

      res.status(500).json({
        success: false,
        message: "Validation service error",
        validation: {
          isValid: false,
          error: "Unable to complete validation at this time",
          verificationTimestamp: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Get public verification info without sensitive data
   * GET /api/ijazah/:id/verify
   * Access: Public (no authentication required)
   */
  async verifyIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { fabloService } = require("../services/fabloService");

      logger.info(`Public verification request for ijazah ID: ${id}`);

      // Use admin credentials
      const userOrganization = Organization.AKADEMIK;
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "adminpw";

      let userToken: string;
      try {
        userToken = await fabloService.enrollUser(
          userOrganization,
          adminUsername,
          adminPassword
        );
      } catch (enrollError) {
        logger.error(
          "Failed to get admin token for verification:",
          enrollError
        );
        res.status(503).json({
          success: false,
          message: "Verification service temporarily unavailable",
        });
        return;
      }

      try {
        const ijazah = await fabricService.getIjazah(
          userOrganization,
          userToken,
          id
        );

        // Return only verification status without full details
        const verificationResult = {
          exists: true,
          isValid: ijazah.Status === "aktif",
          status: ijazah.Status,
          holderName: ijazah.nama,
          graduationYear: new Date(ijazah.tanggalLulus).getFullYear(),
          verificationTimestamp: new Date().toISOString(),
        };

        res.status(200).json({
          success: true,
          message: "Certificate verification completed",
          data: verificationResult,
        });
      } catch (notFoundError) {
        res.status(404).json({
          success: false,
          message: "Certificate not found",
          data: {
            exists: false,
            isValid: false,
            verificationTimestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      logger.error("Error in verifyIjazah controller:", error);

      res.status(500).json({
        success: false,
        message: "Verification service error",
      });
    }
  }

  /**
   * Approve ijazah certificate with rector signature
   * PUT /api/ijazah/:id/approve
   * Access: REKTOR only
   */
  async approveIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (req.user.organization !== Organization.REKTOR) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can approve ijazah certificates",
        });
        return;
      }

      const { id } = req.params;
      const { signatureId } = req.body; // Optional specific signature ID

      logger.info(`Approving ijazah certificate with ID: ${id}`);

      const approvedIjazah = await fabricService.approveIjazah(
        req.user.organization,
        req.token,
        id,
        signatureId
      );

      res.status(200).json({
        success: true,
        message: "Ijazah certificate approved successfully",
        data: {
          ...approvedIjazah,
          certificateUrl: approvedIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(approvedIjazah.ipfsCID)
            : null,
          photoUrl: approvedIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(approvedIjazah.photoCID)
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in approveIjazah controller:", error);

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
   * Reject ijazah certificate
   * PUT /api/ijazah/:id/reject
   * Access: REKTOR only
   */
  async rejectIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (req.user.organization !== Organization.REKTOR) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can reject ijazah certificates",
        });
        return;
      }

      const { id } = req.params;
      const { rejectionReason } = req.body; // Optional rejection reason

      logger.info(`Rejecting ijazah certificate with ID: ${id}`);

      const rejectedIjazah = await fabricService.rejectIjazah(
        req.user.organization,
        req.token,
        id,
        rejectionReason
      );

      res.status(200).json({
        success: true,
        message: "Ijazah certificate rejected successfully",
        data: {
          ...rejectedIjazah,
          certificateUrl: rejectedIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(rejectedIjazah.ipfsCID)
            : null,
          photoUrl: rejectedIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(rejectedIjazah.photoCID)
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in rejectIjazah controller:", error);

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
   * Activate approved ijazah certificate
   * PUT /api/ijazah/:id/activate
   * Access: REKTOR only
   */
  async activateIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (req.user.organization !== Organization.REKTOR) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can activate ijazah certificates",
        });
        return;
      }

      const { id } = req.params;

      logger.info(`Activating ijazah certificate with ID: ${id}`);

      const activatedIjazah = await fabricService.activateIjazah(
        req.user.organization,
        req.token,
        id
      );

      res.status(200).json({
        success: true,
        message: "Ijazah certificate activated successfully",
        data: {
          ...activatedIjazah,
          certificateUrl: activatedIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(activatedIjazah.ipfsCID)
            : null,
          photoUrl: activatedIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(activatedIjazah.photoCID)
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in activateIjazah controller:", error);

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
   * Regenerate certificate PDF with current or specified signature
   * PUT /api/ijazah/:id/regenerate
   * Access: REKTOR only
   */
  async regenerateCertificate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (req.user.organization !== Organization.REKTOR) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can regenerate certificates",
        });
        return;
      }

      const { id } = req.params;
      const { signatureId } = req.body; // Optional specific signature ID

      logger.info(`Regenerating certificate with signature for ID: ${id}`);

      const regeneratedIjazah =
        await fabricService.regenerateCertificateWithSignature(
          req.user.organization,
          req.token,
          id,
          signatureId
        );

      res.status(200).json({
        success: true,
        message: "Certificate regenerated successfully with signature",
        data: {
          ...regeneratedIjazah,
          certificateUrl: regeneratedIjazah.ipfsCID
            ? fabricService.getCertificateDownloadUrl(regeneratedIjazah.ipfsCID)
            : null,
          photoUrl: regeneratedIjazah.photoCID
            ? fabricService.getPhotoDownloadUrl(regeneratedIjazah.photoCID)
            : null,
        },
      });
    } catch (error) {
      logger.error("Error in regenerateCertificate controller:", error);

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
   * Get pending ijazah certificates awaiting rector approval
   * GET /api/ijazah/pending
   * Access: REKTOR only
   */
  async getPendingIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (req.user.organization !== Organization.REKTOR) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can view pending certificates",
        });
        return;
      }

      logger.info("Getting pending ijazah certificates");

      const pendingIjazah = await fabricService.getIjazahByStatus(
        req.user.organization,
        req.token,
        IJAZAH_STATUS.MENUNGGU_TTD
      );

      // Add download URLs to each ijazah
      const enrichedIjazahList = pendingIjazah.map((ijazah) => ({
        ...ijazah,
        certificateUrl: ijazah.ipfsCID
          ? fabricService.getCertificateDownloadUrl(ijazah.ipfsCID)
          : null,
        photoUrl: ijazah.photoCID
          ? fabricService.getPhotoDownloadUrl(ijazah.photoCID)
          : null,
      }));

      res.status(200).json({
        success: true,
        message: "Pending ijazah certificates retrieved successfully",
        data: enrichedIjazahList,
        count: enrichedIjazahList.length,
      });
    } catch (error) {
      logger.error("Error in getPendingIjazah controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Bulk approve multiple ijazah certificates
   * POST /api/ijazah/bulk-approve
   * Access: REKTOR only
   */
  async bulkApproveIjazah(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user || !req.token) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      if (req.user.organization !== Organization.REKTOR) {
        res.status(403).json({
          success: false,
          message:
            "Access denied: Only REKTOR organization can bulk approve certificates",
        });
        return;
      }

      const { ijazahIds, signatureId } = req.body;

      if (!ijazahIds || !Array.isArray(ijazahIds) || ijazahIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "ijazahIds array is required and must not be empty",
        });
        return;
      }

      logger.info(`Bulk approving ${ijazahIds.length} ijazah certificates`);

      const results = [];
      const errors = [];

      for (const ijazahId of ijazahIds) {
        try {
          const approvedIjazah = await fabricService.approveIjazah(
            req.user.organization,
            req.token,
            ijazahId,
            signatureId
          );
          results.push({
            ijazahId,
            status: "approved",
            data: approvedIjazah,
          });
        } catch (error) {
          errors.push({
            ijazahId,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      res.status(200).json({
        success: true,
        message: `Bulk approval completed. ${results.length} approved, ${errors.length} failed.`,
        data: {
          approved: results,
          errors: errors,
          summary: {
            total: ijazahIds.length,
            approved: results.length,
            failed: errors.length,
          },
        },
      });
    } catch (error) {
      logger.error("Error in bulkApproveIjazah controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }

  /**
   * Get available status options
   * GET /api/ijazah/statuses
   * Access: All authenticated users
   */
  async getAvailableStatuses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: "Authentication required",
        });
        return;
      }

      const statuses = Object.values(IJAZAH_STATUS);

      res.status(200).json({
        success: true,
        message: "Available statuses retrieved successfully",
        data: statuses,
      });
    } catch (error) {
      logger.error("Error in getAvailableStatuses controller:", error);

      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
}

// Export controller instance
export const ijazahController = new IjazahController();
