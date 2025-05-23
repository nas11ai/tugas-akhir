import { fabloService } from "./fabloService";
import { ipfsClusterService } from "./ipfsClusterService";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";
import {
  Ijazah,
  IjazahInput,
  Signature,
  SignatureInput,
} from "../models/ijazah";
import { v4 as uuidv4 } from "uuid";
import * as fs from "fs";
import * as path from "path";
import { IJAZAH_STATUS } from "../config/fabric";

interface CertificateGenerationOptions {
  templatePath?: string;
  outputFormat?: "pdf" | "png";
  dpi?: number;
}

/**
 * Fabric Service for Certificate Management
 * Integrates Hyperledger Fabric with IPFS for certificate management
 */
export class FabricService {
  private readonly defaultTemplatePath = path.join(
    process.cwd(),
    "templates",
    "ijazah-template.pdf"
  );

  constructor() {}

  /**
   * Validate user organization access for ijazah operations
   */
  private validateAkademikAccess(organization: Organization): void {
    if (organization !== Organization.AKADEMIK) {
      throw new Error(
        "Access denied: Only AKADEMIK organization can manage ijazah certificates"
      );
    }
  }

  /**
   * Validate user organization access for signature operations
   */
  private validateRektorAccess(organization: Organization): void {
    if (organization !== Organization.REKTOR) {
      throw new Error(
        "Access denied: Only REKTOR organization can manage signatures"
      );
    }
  }

  /**
   * Generate certificate PDF from template with provided data
   */
  private async generateCertificatePDF(
    ijazahData: IjazahInput,
    photoBuffer?: Buffer,
    signatureUrl?: string,
    options: CertificateGenerationOptions = {}
  ): Promise<Buffer> {
    try {
      // This is a placeholder for PDF generation logic
      // In a real implementation, you would use libraries like:
      // - pdf-lib for PDF manipulation
      // - puppeteer for HTML to PDF conversion
      // - PDFtk or similar tools

      logger.info(`Generating certificate PDF for ${ijazahData.nama}`);

      // For now, we'll create a simple text-based representation
      // Replace this with actual PDF generation logic
      const certificateContent = `
SERTIFIKAT IJAZAH
================

Nomor Dokumen: ${ijazahData.nomorDokumen}
Nomor Ijazah Nasional: ${ijazahData.nomorIjazahNasional}
Nama: ${ijazahData.nama}
Tempat Lahir: ${ijazahData.tempatLahir || "N/A"}
Tanggal Lahir: ${ijazahData.tanggalLahir}
NIK: ${ijazahData.nomorIndukKependudukan}
Program Studi: ${ijazahData.programStudi}
Fakultas: ${ijazahData.fakultas}
Tahun Diterima: ${ijazahData.tahunDiterima}
NIM: ${ijazahData.nomorIndukMahasiswa}
Tanggal Lulus: ${ijazahData.tanggalLulus}
Jenis Pendidikan: ${ijazahData.jenisPendidikan}
Gelar: ${ijazahData.gelarPendidikan}
Akreditasi: ${ijazahData.akreditasiProgramStudi}
Keputusan Akreditasi: ${ijazahData.keputusanAkreditasiProgramStudi}
Tempat Diberikan: ${ijazahData.tempatIjazahDiberikan}
Tanggal Diberikan: ${ijazahData.tanggalIjazahDiberikan}

${photoBuffer ? "[FOTO MAHASISWA ATTACHED]" : "[NO PHOTO]"}
${signatureUrl ? "[TANDA TANGAN REKTOR ATTACHED]" : "[MENUNGGU TANDA TANGAN]"}
      `;

      // Convert text to buffer (in real implementation, this would be actual PDF)
      return Buffer.from(certificateContent, "utf-8");
    } catch (error) {
      logger.error("Error generating certificate PDF:", error);
      throw new Error("Failed to generate certificate PDF");
    }
  }

  /**
   * Create new ijazah certificate (AKADEMIK only)
   */
  async createIjazah(
    organization: Organization,
    userToken: string,
    ijazahData: IjazahInput,
    photoFile?: Buffer
  ): Promise<Ijazah> {
    try {
      // Validate access
      this.validateAkademikAccess(organization);

      // Generate unique ID for ijazah
      const ijazahId = `ijazah_${Date.now()}_${uuidv4().substring(0, 8)}`;

      logger.info(`Creating ijazah certificate with ID: ${ijazahId}`);

      // Upload photo to IPFS if provided
      let photoCID: string | undefined;
      if (photoFile && photoFile.length > 0) {
        logger.info("Uploading photo to IPFS...");
        const photoResult = await ipfsClusterService.add(photoFile, {
          filename: `${ijazahId}_photo.jpg`,
          local: false,
        });
        photoCID = photoResult.cid;

        // Pin the photo
        await ipfsClusterService.pin(photoCID);
        logger.info(`Photo uploaded and pinned with CID: ${photoCID}`);
      }

      // Generate certificate PDF (without signature - will be added later)
      logger.info("Generating certificate PDF...");
      const certificatePDF = await this.generateCertificatePDF(
        ijazahData,
        photoFile,
        undefined // No signature yet
      );

      // Upload certificate PDF to IPFS
      logger.info("Uploading certificate PDF to IPFS...");
      const certificateResult = await ipfsClusterService.add(certificatePDF, {
        filename: `${ijazahId}_certificate.pdf`,
        local: false,
      });

      // Pin the certificate
      await ipfsClusterService.pin(certificateResult.cid);
      logger.info(
        `Certificate PDF uploaded and pinned with CID: ${certificateResult.cid}`
      );

      // Prepare ijazah data for blockchain
      const ijazah: Ijazah = {
        ID: ijazahId,
        Type: "certificate",
        ...ijazahData,
        ipfsCID: certificateResult.cid,
        photoCID,
        Status: IJAZAH_STATUS.MENUNGGU_TTD,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString(),
      };

      // Store in blockchain via chaincode
      logger.info("Storing ijazah data in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "CreateIjazah",
          args: [JSON.stringify(ijazah)],
        }
      );

      logger.info(
        `Ijazah certificate created successfully with ID: ${ijazahId}`
      );
      return JSON.parse(blockchainResult);
    } catch (error) {
      logger.error("Error creating ijazah certificate:", error);
      throw error;
    }
  }

  /**
   * Update existing ijazah certificate (AKADEMIK only)
   * Can only update if status is not "menunggu tanda tangan rektor"
   */
  async updateIjazah(
    organization: Organization,
    userToken: string,
    ijazahId: string,
    ijazahData: Partial<IjazahInput>,
    photoFile?: Buffer
  ): Promise<Ijazah> {
    try {
      // Validate access
      this.validateAkademikAccess(organization);

      // Get existing ijazah from blockchain
      logger.info(`Updating ijazah certificate with ID: ${ijazahId}`);
      const existingIjazahStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadIjazah",
          args: [ijazahId],
        }
      );

      const existingIjazah: Ijazah = JSON.parse(existingIjazahStr);

      // Validate status - cannot update if waiting for signature
      if (existingIjazah.Status === IJAZAH_STATUS.MENUNGGU_TTD) {
        throw new Error(
          "Cannot update ijazah while waiting for rector signature"
        );
      }

      // Merge existing data with updates
      const updatedData: IjazahInput = {
        ...existingIjazah,
        ...ijazahData,
      };

      // Handle photo update if provided
      let photoCID = existingIjazah.photoCID;
      if (photoFile && photoFile.length > 0) {
        logger.info("Uploading new photo to IPFS...");

        // Unpin old photo if exists
        if (photoCID) {
          try {
            await ipfsClusterService.unpin(photoCID);
          } catch (error) {
            logger.warn(`Failed to unpin old photo CID: ${photoCID}`, error);
          }
        }

        // Upload new photo
        const photoResult = await ipfsClusterService.add(photoFile, {
          filename: `${ijazahId}_photo_updated.jpg`,
          local: false,
        });
        photoCID = photoResult.cid;

        // Pin the new photo
        await ipfsClusterService.pin(photoCID);
        logger.info(`New photo uploaded and pinned with CID: ${photoCID}`);
      }

      // Generate updated certificate PDF
      logger.info("Generating updated certificate PDF...");

      // Get signature URL if exists
      let signatureUrl: string | undefined;
      if (existingIjazah.signatureID) {
        try {
          const signatureStr = await fabloService.queryChaincode(
            organization,
            userToken,
            {
              method: "ReadSignature",
              args: [existingIjazah.signatureID],
            }
          );
          const signature: Signature = JSON.parse(signatureStr);
          signatureUrl = signature.URL;
        } catch (error) {
          logger.warn(
            `Failed to get signature for ID: ${existingIjazah.signatureID}`,
            error
          );
        }
      }

      const certificatePDF = await this.generateCertificatePDF(
        updatedData,
        photoFile,
        signatureUrl
      );

      // Unpin old certificate
      if (existingIjazah.ipfsCID) {
        try {
          await ipfsClusterService.unpin(existingIjazah.ipfsCID);
        } catch (error) {
          logger.warn(
            `Failed to unpin old certificate CID: ${existingIjazah.ipfsCID}`,
            error
          );
        }
      }

      // Upload new certificate PDF to IPFS
      logger.info("Uploading updated certificate PDF to IPFS...");
      const certificateResult = await ipfsClusterService.add(certificatePDF, {
        filename: `${ijazahId}_certificate_updated.pdf`,
        local: false,
      });

      // Pin the new certificate
      await ipfsClusterService.pin(certificateResult.cid);
      logger.info(
        `Updated certificate PDF uploaded and pinned with CID: ${certificateResult.cid}`
      );

      // Prepare updated ijazah data for blockchain
      const updatedIjazah: Ijazah = {
        ...existingIjazah,
        ...updatedData,
        ipfsCID: certificateResult.cid,
        photoCID,
        UpdatedAt: new Date().toISOString(),
      };

      // Update in blockchain via chaincode
      logger.info("Updating ijazah data in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateIjazah",
          args: [JSON.stringify(updatedIjazah)],
        }
      );

      logger.info(
        `Ijazah certificate updated successfully with ID: ${ijazahId}`
      );
      return JSON.parse(blockchainResult);
    } catch (error) {
      logger.error("Error updating ijazah certificate:", error);
      throw error;
    }
  }

  /**
   * Get ijazah certificate by ID
   */
  async getIjazah(
    organization: Organization,
    userToken: string,
    ijazahId: string
  ): Promise<Ijazah> {
    try {
      logger.info(`Getting ijazah certificate with ID: ${ijazahId}`);

      const ijazahStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadIjazah",
          args: [ijazahId],
        }
      );

      return JSON.parse(ijazahStr);
    } catch (error) {
      logger.error("Error getting ijazah certificate:", error);
      throw error;
    }
  }

  /**
   * Get all ijazah certificates
   */
  async getAllIjazah(
    organization: Organization,
    userToken: string
  ): Promise<Ijazah[]> {
    try {
      logger.info("Getting all ijazah certificates");

      const ijazahArrayStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "GetAllIjazah",
          args: [],
        }
      );

      return JSON.parse(ijazahArrayStr);
    } catch (error) {
      logger.error("Error getting all ijazah certificates:", error);
      throw error;
    }
  }

  /**
   * Get ijazah certificates by status
   */
  async getIjazahByStatus(
    organization: Organization,
    userToken: string,
    status: string
  ): Promise<Ijazah[]> {
    try {
      logger.info(`Getting ijazah certificates with status: ${status}`);

      const ijazahArrayStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "GetIjazahByStatus",
          args: [status],
        }
      );

      return JSON.parse(ijazahArrayStr);
    } catch (error) {
      logger.error("Error getting ijazah certificates by status:", error);
      throw error;
    }
  }

  /**
   * Update ijazah status (REKTOR only for approval/rejection)
   */
  async updateIjazahStatus(
    organization: Organization,
    userToken: string,
    ijazahId: string,
    newStatus: string
  ): Promise<Ijazah> {
    try {
      // For approval/rejection, only REKTOR can do this
      if (
        newStatus === IJAZAH_STATUS.DISETUJUI ||
        newStatus === IJAZAH_STATUS.DITOLAK
      ) {
        this.validateRektorAccess(organization);
      }

      logger.info(
        `Updating ijazah status to: ${newStatus} for ID: ${ijazahId}`
      );

      const ijazahStr = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateIjazahStatus",
          args: [ijazahId, newStatus],
        }
      );

      return JSON.parse(ijazahStr);
    } catch (error) {
      logger.error("Error updating ijazah status:", error);
      throw error;
    }
  }

  /**
   * Delete ijazah certificate
   */
  async deleteIjazah(
    organization: Organization,
    userToken: string,
    ijazahId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validate access
      this.validateAkademikAccess(organization);

      // Get ijazah data first to clean up IPFS files
      try {
        const existingIjazah = await this.getIjazah(
          organization,
          userToken,
          ijazahId
        );

        // Unpin files from IPFS
        if (existingIjazah.ipfsCID) {
          try {
            await ipfsClusterService.unpin(existingIjazah.ipfsCID);
            logger.info(`Unpinned certificate CID: ${existingIjazah.ipfsCID}`);
          } catch (error) {
            logger.warn(
              `Failed to unpin certificate CID: ${existingIjazah.ipfsCID}`,
              error
            );
          }
        }

        if (existingIjazah.photoCID) {
          try {
            await ipfsClusterService.unpin(existingIjazah.photoCID);
            logger.info(`Unpinned photo CID: ${existingIjazah.photoCID}`);
          } catch (error) {
            logger.warn(
              `Failed to unpin photo CID: ${existingIjazah.photoCID}`,
              error
            );
          }
        }
      } catch (error) {
        logger.warn("Failed to get ijazah data for cleanup:", error);
      }

      // Delete from blockchain
      logger.info(`Deleting ijazah certificate with ID: ${ijazahId}`);
      const result = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "DeleteIjazah",
          args: [ijazahId],
        }
      );

      return JSON.parse(result);
    } catch (error) {
      logger.error("Error deleting ijazah certificate:", error);
      throw error;
    }
  }

  // === Signature Management Functions ===

  /**
   * Create signature (REKTOR only)
   */
  async createSignature(
    organization: Organization,
    userToken: string,
    signatureData: SignatureInput
  ): Promise<Signature> {
    try {
      this.validateRektorAccess(organization);

      logger.info(`Creating signature with ID: ${signatureData.ID}`);

      const result = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "CreateSignature",
          args: [JSON.stringify(signatureData)],
        }
      );

      return JSON.parse(result);
    } catch (error) {
      logger.error("Error creating signature:", error);
      throw error;
    }
  }

  /**
   * Update signature (REKTOR only)
   */
  async updateSignature(
    organization: Organization,
    userToken: string,
    signatureId: string,
    signatureData: Partial<SignatureInput>
  ): Promise<Signature> {
    try {
      this.validateRektorAccess(organization);

      logger.info(`Updating signature with ID: ${signatureId}`);

      const updateData = {
        ID: signatureId,
        ...signatureData,
      };

      const result = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateSignature",
          args: [JSON.stringify(updateData)],
        }
      );

      return JSON.parse(result);
    } catch (error) {
      logger.error("Error updating signature:", error);
      throw error;
    }
  }

  /**
   * Get signature by ID
   */
  async getSignature(
    organization: Organization,
    userToken: string,
    signatureId: string
  ): Promise<Signature> {
    try {
      logger.info(`Getting signature with ID: ${signatureId}`);

      const signatureStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadSignature",
          args: [signatureId],
        }
      );

      return JSON.parse(signatureStr);
    } catch (error) {
      logger.error("Error getting signature:", error);
      throw error;
    }
  }

  /**
   * Get active signature
   */
  async getActiveSignature(
    organization: Organization,
    userToken: string
  ): Promise<Signature> {
    try {
      logger.info("Getting active signature");

      const signatureStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "GetActiveSignature",
          args: [],
        }
      );

      return JSON.parse(signatureStr);
    } catch (error) {
      logger.error("Error getting active signature:", error);
      throw error;
    }
  }

  /**
   * Get all signatures
   */
  async getAllSignatures(
    organization: Organization,
    userToken: string
  ): Promise<Signature[]> {
    try {
      logger.info("Getting all signatures");

      const signaturesStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "GetAllSignatures",
          args: [],
        }
      );

      return JSON.parse(signaturesStr);
    } catch (error) {
      logger.error("Error getting all signatures:", error);
      throw error;
    }
  }

  /**
   * Set active signature (REKTOR only)
   */
  async setActiveSignature(
    organization: Organization,
    userToken: string,
    signatureId: string
  ): Promise<Signature> {
    try {
      this.validateRektorAccess(organization);

      logger.info(`Setting active signature ID: ${signatureId}`);

      const result = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "SetActiveSignature",
          args: [signatureId],
        }
      );

      return JSON.parse(result);
    } catch (error) {
      logger.error("Error setting active signature:", error);
      throw error;
    }
  }

  /**
   * Delete signature (REKTOR only)
   */
  async deleteSignature(
    organization: Organization,
    userToken: string,
    signatureId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      this.validateRektorAccess(organization);

      logger.info(`Deleting signature with ID: ${signatureId}`);

      const result = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "DeleteSignature",
          args: [signatureId],
        }
      );

      return JSON.parse(result);
    } catch (error) {
      logger.error("Error deleting signature:", error);
      throw error;
    }
  }

  // === Utility Functions ===

  /**
   * Get certificate download URL from IPFS
   */
  getCertificateDownloadUrl(ipfsCID: string): string | null {
    if (!ipfsCID) return null;

    // Assuming getIpfsGatewayUrl is available from config
    // This should return the public IPFS gateway URL
    return `${
      process.env.IPFS_GATEWAY_URL || "https://gateway.ipfs.io"
    }/ipfs/${ipfsCID}`;
  }

  /**
   * Get photo download URL from IPFS
   */
  getPhotoDownloadUrl(photoCID: string): string | null {
    if (!photoCID) return null;

    return `${
      process.env.IPFS_GATEWAY_URL || "https://gateway.ipfs.io"
    }/ipfs/${photoCID}`;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    fabric: { akademik: boolean; rektor: boolean };
    ipfs: boolean;
    overall: boolean;
  }> {
    try {
      // Check Fabric health
      const fabricHealth = await fabloService.healthCheck();

      // Check IPFS health
      let ipfsHealth = false;
      try {
        await ipfsClusterService.info();
        ipfsHealth = true;
      } catch (error) {
        logger.warn("IPFS health check failed:", error);
      }

      const overall =
        fabricHealth.akademik && fabricHealth.rektor && ipfsHealth;

      return {
        fabric: fabricHealth,
        ipfs: ipfsHealth,
        overall,
      };
    } catch (error) {
      logger.error("Health check failed:", error);
      return {
        fabric: { akademik: false, rektor: false },
        ipfs: false,
        overall: false,
      };
    }
  }
}

// Export singleton instance
export const fabricService = new FabricService();
