import { fabloService } from "./fabloService";
import { ipfsClusterService } from "./ipfsClusterService";
import { fileStorageService } from "./fileStorageService";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";
import {
  Ijazah,
  IjazahInput,
  Mahasiswa,
  Signature,
  SignatureInput,
} from "../models/ijazah";
import fs from "fs/promises";
import { PDFDocument } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import { IJAZAH_STATUS } from "../configs/fabric";
import dotenv from "dotenv";
import mahasiswa from "../configs/mahasiswa.json";

dotenv.config();

/**
 * Fabric Service for Certificate Management
 * Integrates Hyperledger Fabric with IPFS for certificate management
 * Uses local storage for photos and signatures
 */
export class FabricService {
  private readonly defaultTemplatePath = path.join(
    process.cwd(),
    "src",
    "configs",
    "template.pdf"
  );

  constructor() { }

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
  private validateRektorAkademikAccess(organization: Organization): void {
    if (
      organization !== Organization.REKTOR &&
      organization !== Organization.AKADEMIK
    ) {
      throw new Error(
        "Access denied: Only REKTOR and AKADEMIK organization can manage signatures"
      );
    }
  }

  /**
   * Generate certificate PDF from template with provided data
   */
  private async generateCertificatePDF(
    ijazahData: IjazahInput,
    photoPath: string,
    signaturePath: string
  ): Promise<Buffer> {
    try {
      logger.info(
        `Generating certificate PDF for ${ijazahData.nama} - NIM ${ijazahData.nomorIndukMahasiswa}`
      );

      // Read photo and signature from local storage
      const photoImageBytes = await fileStorageService.getPhoto(photoPath);
      const signatureImageBytes = await fileStorageService.getSignature(
        signaturePath
      );

      const templateBytes = await fs.readFile(this.defaultTemplatePath);

      const pdfDoc = await PDFDocument.load(templateBytes);
      const photo = await pdfDoc.embedPng(photoImageBytes);
      const signature = await pdfDoc.embedPng(signatureImageBytes);

      const photoDims = photo.scale(0.2);
      const signatureDims = signature.scale(0.3);

      const page = pdfDoc.getPages()[0];

      page.drawImage(signature, {
        x: 550,
        y: 52,
        width: signatureDims.width,
        height: signatureDims.height,
      });

      page.drawImage(photo, {
        x: 240,
        y: 25,
        width: photoDims.width,
        height: photoDims.height,
      });

      const form = pdfDoc.getForm();

      const tanggalFields = [
        "tanggalLahir",
        "tanggalLulus",
        "tanggalIjazahDiberikan",
      ];

      const formatTanggalIndonesia = (isoDateStr: string): string => {
        const date = new Date(isoDateStr);
        return new Intl.DateTimeFormat("id-ID", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        }).format(date);
      };

      for (const [key, value] of Object.entries(ijazahData)) {
        if (!value) continue;

        let finalValue = value.toString();
        if (tanggalFields.includes(key)) {
          try {
            finalValue = formatTanggalIndonesia(value);
          } catch (err) {
            logger.warn(`Failed to format '${key}': ${value}`);
          }
        }

        try {
          const field = form.getTextField(key);
          field.setText(finalValue);
        } catch (err) {
          logger.warn(`Field '${key}' not found in PDF form. Skipping.`);
        }
      }

      const pdfBytes = await pdfDoc.save();
      const pdfBuffer = Buffer.from(pdfBytes);

      return pdfBuffer;
    } catch (error) {
      logger.error("Error generating certificate PDF:", error);
      throw new Error("Failed to generate certificate PDF");
    }
  }

  /**
   * Find mahasiswa by NIM
   */
  findMahasiswaByNim(nim: string): Mahasiswa | undefined {
    const result = mahasiswa.find((mhs) => mhs.nomorIndukMahasiswa === nim);
    return result;
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

      // Save photo to local storage if provided
      let photoPath: string | undefined;
      if (photoFile && photoFile.length > 0) {
        logger.info("Saving photo to local storage...");
        const photoFileName = fileStorageService.generateFileName(
          `photo_${ijazahId}`,
          "photo.png"
        );
        photoPath = await fileStorageService.savePhoto(
          photoFile,
          photoFileName
        );
        logger.info(`Photo saved with filename: ${photoPath}`);
      }

      if (!photoPath) {
        throw new Error("Photo is required");
      }

      // Get active signature
      const signatureStr: string = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "GetActiveSignature",
          args: [],
        }
      );

      const signatureData: Signature = JSON.parse(signatureStr);

      const {
        photo: _photo,
        ipfsCID: _ipfsCID,
        signatureID: _signatureID,
        Status: _status,
        photoPath: _photoPath,
        ...certificateData
      } = ijazahData as any;

      // Generate certificate PDF
      logger.info("Generating certificate PDF...");
      const certificatePDF = await this.generateCertificatePDF(
        certificateData,
        photoPath,
        signatureData.filePath
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

      // Clean ijazah data
      const { photo: _, ...cleanIjazahData } = ijazahData as any;

      // Prepare ijazah data for blockchain
      const ijazah: Ijazah = {
        ID: ijazahId,
        Type: "certificate",
        ...cleanIjazahData,
        ipfsCID: certificateResult.cid,
        photoPath,
      };

      // Store in blockchain via chaincode
      logger.info("Storing ijazah data in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "IjazahContract:CreateIjazah",
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

      if (!existingIjazahStr) {
        throw new Error(`Ijazah with ID ${ijazahId} not found`);
      }

      const existingIjazah: Ijazah = JSON.parse(existingIjazahStr);

      const { photo: _, ...cleanIjazahData } = ijazahData as any;

      // Merge existing data with updates
      const updatedData: IjazahInput = {
        ...existingIjazah,
        ...cleanIjazahData,
      };

      // Handle photo update if provided
      let photoPath = existingIjazah.photoPath;
      if (photoFile && photoFile.length > 0) {
        logger.info("Updating photo in local storage...");

        // Delete old photo if exists
        if (photoPath) {
          await fileStorageService.deletePhoto(photoPath);
        }

        // Save new photo
        const photoFileName = fileStorageService.generateFileName(
          `photo_${ijazahId}`,
          "photo.png"
        );
        photoPath = await fileStorageService.savePhoto(
          photoFile,
          photoFileName
        );
        logger.info(`New photo saved with filename: ${photoPath}`);
      }

      if (!photoPath) {
        throw new Error("Photo file is required");
      }

      // Generate updated certificate PDF
      logger.info("Generating updated certificate PDF...");

      const signatureStr: string = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "GetActiveSignature",
          args: [],
        }
      );

      const signatureData: Signature = JSON.parse(signatureStr);

      const {
        photo: _photo,
        ipfsCID: _ipfsCID,
        signatureID: _signatureID,
        Status: _status,
        photoPath: _photoPath,
        ...certificateData
      } = updatedData as any;

      const certificatePDF = await this.generateCertificatePDF(
        certificateData,
        photoPath,
        signatureData.filePath
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
        photoPath,
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

      if (!ijazahStr) {
        throw new Error("Ijazah not found");
      }

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

      // Get ijazah data first to clean up files
      try {
        const existingIjazah = await this.getIjazah(
          organization,
          userToken,
          ijazahId
        );

        // Unpin certificate from IPFS
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

        // Delete photo from local storage
        if (existingIjazah.photoPath) {
          try {
            await fileStorageService.deletePhoto(existingIjazah.photoPath);
            logger.info(`Deleted photo: ${existingIjazah.photoPath}`);
          } catch (error) {
            logger.warn(
              `Failed to delete photo: ${existingIjazah.photoPath}`,
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
      this.validateRektorAkademikAccess(organization);

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
      this.validateRektorAkademikAccess(organization);

      logger.info(`Updating signature with ID: ${signatureId}`);

      const updateData = {
        ID: signatureId,
        ...signatureData,
      };

      if (!updateData.filePath) {
        const existingSignature = await this.getSignature(
          organization,
          userToken,
          signatureId
        );

        if (!existingSignature) {
          throw new Error("Signature not found");
        }

        updateData.filePath = existingSignature.filePath;
      }

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
  ): Promise<Signature | null> {
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
      this.validateRektorAkademikAccess(organization);

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
      this.validateRektorAkademikAccess(organization);

      // Get signature data first to clean up local file
      try {
        const existingSignature = await this.getSignature(
          organization,
          userToken,
          signatureId
        );

        if (existingSignature && existingSignature.filePath) {
          await fileStorageService.deleteSignature(existingSignature.filePath);
          logger.info(`Deleted signature file: ${existingSignature.filePath}`);
        }
      } catch (error) {
        logger.warn("Failed to get signature data for cleanup:", error);
      }

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

    return `${process.env.IPFS_GATEWAY_URL || "https://gateway.ipfs.io"
      }/ipfs/${ipfsCID}`;
  }

  /**
   * Health check for the service
   */
  async healthCheck(): Promise<{
    fabric: { akademik: boolean; rektor: boolean };
    ipfs: boolean;
    localStorage: boolean;
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

      // Check local storage health
      let localStorageHealth = false;
      try {
        await fileStorageService.getStorageStats();
        localStorageHealth = true;
      } catch (error) {
        logger.warn("Local storage health check failed:", error);
      }

      const overall =
        fabricHealth.akademik &&
        fabricHealth.rektor &&
        ipfsHealth &&
        localStorageHealth;

      return {
        fabric: fabricHealth,
        ipfs: ipfsHealth,
        localStorage: localStorageHealth,
        overall,
      };
    } catch (error) {
      logger.error("Health check failed:", error);
      return {
        fabric: { akademik: false, rektor: false },
        ipfs: false,
        localStorage: false,
        overall: false,
      };
    }
  }
}

// Export singleton instance
export const fabricService = new FabricService();
