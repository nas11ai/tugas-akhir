import { fabloService } from "./fabloService";
import { ipfsClusterService } from "./ipfsClusterService";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";
import {
  Ijazah,
  IjazahInput,
  Mahasiswa,
  Signature,
  SignatureInput,
} from "../models/ijazah";
import sharp from "sharp";
import fs from "fs/promises";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { v4 as uuidv4 } from "uuid";
import * as path from "path";
import { IJAZAH_STATUS } from "../configs/fabric";
import dotenv from "dotenv";
import mahasiswa from "../configs/mahasiswa.json";

dotenv.config();

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
    "src",
    "configs",
    "template.pdf"
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
   * Check if buffer is PNG
   */
  private isPNG(buffer: ArrayBuffer): boolean {
    const header = new Uint8Array(buffer.slice(0, 8));
    const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];

    return pngSignature.every((byte, i) => header[i] === byte);
  }

  private async resizeImageByLabel(
    buffer: Buffer,
    label: "Photo" | "Signature"
  ): Promise<Buffer> {
    const dimensions: Record<typeof label, { width: number; height: number }> =
      {
        Photo: { width: 496, height: 659 },
        Signature: { width: 667, height: 276 },
      };

    const size = dimensions[label];
    if (!size) {
      throw new Error(`Unknown label: ${label}`);
    }

    return sharp(buffer)
      .resize(size.width, size.height, { fit: "fill" })
      .png()
      .toBuffer();
  }

  /**
   * Fetch and validate PNG file
   */
  private async fetchAndValidatePNG(
    url: string,
    label: "Photo" | "Signature"
  ): Promise<ArrayBuffer> {
    try {
      const imageRequestOptions = {
        method: "get",
        headers: new Headers({
          "ngrok-skip-browser-warning": "69420",
        }),
      };

      const res = await fetch(url, imageRequestOptions);

      if (!res.ok) {
        throw new Error(`${label} fetch failed with status ${res.status}`);
      }

      const buffer = await res.arrayBuffer();

      if (!this.isPNG(buffer)) {
        throw new Error(`${label} is not in PNG format`);
      }

      return this.resizeImageByLabel(Buffer.from(buffer), label);
    } catch (err) {
      throw new Error(`Error fetching ${label}: ${(err as Error).message}`);
    }
  }

  /**
   * Generate certificate PDF from template with provided data
   */
  private async generateCertificatePDF(
    ijazahData: IjazahInput,
    photoCID: string,
    signatureCID: string
  ): Promise<Buffer> {
    try {
      logger.info(
        `Generating certificate PDF for ${ijazahData.nama} - NIM ${ijazahData.nomorIndukMahasiswa}`
      );

      const baseUrl = process.env.BACKEND_URL || "http://localhost:3000";
      const photoUrl = `${baseUrl}/ipfs/${photoCID}`;
      const signatureUrl = `${baseUrl}/ipfs/${signatureCID}`;

      const photoImageBytes = await this.fetchAndValidatePNG(photoUrl, "Photo");
      const signatureImageBytes = await this.fetchAndValidatePNG(
        signatureUrl,
        "Signature"
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

      // Simpan jadi Uint8Array
      const pdfBytes = await pdfDoc.save();

      // Konversi ke Buffer
      const pdfBuffer = Buffer.from(pdfBytes);

      // Convert text to buffer (in real implementation, this would be actual PDF)
      return pdfBuffer;
    } catch (error) {
      logger.error("Error generating certificate PDF:", error);
      throw new Error("Failed to generate certificate PDF");
    }
  }

  /**
   * Find mahasiswa by NIM
   * @param nim NIM of the mahasiswa
   * @returns Mahasiswa object
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

      if (!photoCID) {
        throw new Error("Photo is required");
      }

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
        ...certificateData
      } = ijazahData as any;

      // Generate certificate PDF (without signature - will be added later)
      logger.info("Generating certificate PDF...");
      const certificatePDF = await this.generateCertificatePDF(
        certificateData,
        photoCID,
        signatureData.CID
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

      const { photo: _, ...cleanIjazahData } = ijazahData as any;

      // Prepare ijazah data for blockchain
      const ijazah: Ijazah = {
        ID: ijazahId,
        Type: "certificate",
        ...cleanIjazahData,
        ipfsCID: certificateResult.cid,
        photoCID,
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

      if (!photoCID) {
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
        ...certificateData
      } = updatedData as any;

      const certificatePDF = await this.generateCertificatePDF(
        certificateData,
        photoCID,
        signatureData.CID
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
   * Approve ijazah certificate with rector signature (REKTOR only)
   */
  async approveIjazah(
    organization: Organization,
    userToken: string,
    ijazahId: string,
    signatureId?: string
  ): Promise<Ijazah> {
    try {
      // Validate access
      this.validateRektorAkademikAccess(organization);

      logger.info(`Approving ijazah certificate with ID: ${ijazahId}`);

      // Get existing ijazah from blockchain
      const existingIjazahStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadIjazah",
          args: [ijazahId],
        }
      );

      if (!existingIjazahStr) {
        throw new Error(`Ijazah with ID: ${ijazahId} not found`);
      }

      const existingIjazah: Ijazah = JSON.parse(existingIjazahStr);

      // Check if ijazah is in correct status for approval
      if (existingIjazah.Status !== IJAZAH_STATUS.MENUNGGU_TTD) {
        throw new Error(
          `Cannot approve ijazah with status: ${existingIjazah.Status}`
        );
      }

      if (!existingIjazah.photoCID) {
        throw new Error("Photo file is required");
      }

      // Get active signature if no specific signature provided
      let activeSignature: Signature;
      if (signatureId) {
        const signatureStr = await fabloService.queryChaincode(
          organization,
          userToken,
          {
            method: "ReadSignature",
            args: [signatureId],
          }
        );
        activeSignature = JSON.parse(signatureStr);
      } else {
        const activeSignatureStr = await fabloService.queryChaincode(
          organization,
          userToken,
          {
            method: "GetActiveSignature",
            args: [],
          }
        );
        activeSignature = JSON.parse(activeSignatureStr);
      }

      if (!activeSignature) {
        throw new Error("No active signature found for approval");
      }

      logger.info(`Using signature: ${activeSignature.ID} for approval`);

      const {
        photo: _photo,
        ipfsCID: _ipfsCID,
        signatureID: _signatureID,
        Status: _status,
        ...certificateData
      } = existingIjazah as any;

      // Generate new certificate PDF with signature
      logger.info("Generating approved certificate PDF with signature...");
      const approvedCertificatePDF = await this.generateCertificatePDF(
        certificateData,
        existingIjazah.photoCID,
        activeSignature.CID
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

      // Upload new approved certificate PDF to IPFS
      logger.info("Uploading approved certificate PDF to IPFS...");
      const certificateResult = await ipfsClusterService.add(
        approvedCertificatePDF,
        {
          filename: `${ijazahId}_certificate_approved.pdf`,
          local: false,
        }
      );

      // Pin the approved certificate
      await ipfsClusterService.pin(certificateResult.cid);
      logger.info(
        `Approved certificate PDF uploaded and pinned with CID: ${certificateResult.cid}`
      );

      // Update ijazah data with signature and new status
      const approvedIjazah: Ijazah = {
        ...existingIjazah,
        ipfsCID: certificateResult.cid,
        signatureID: activeSignature.ID,
        Status: IJAZAH_STATUS.DISETUJUI,
        UpdatedAt: new Date().toISOString(),
      };

      // Update in blockchain via chaincode
      logger.info("Updating approved ijazah data in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateIjazah",
          args: [JSON.stringify(approvedIjazah)],
        }
      );

      logger.info(
        `Ijazah certificate approved successfully with ID: ${ijazahId}`
      );
      return JSON.parse(blockchainResult);
    } catch (error) {
      logger.error("Error approving ijazah certificate:", error);
      throw error;
    }
  }

  /**
   * Reject ijazah certificate (REKTOR only)
   */
  async rejectIjazah(
    organization: Organization,
    userToken: string,
    ijazahId: string,
    rejectionReason?: string
  ): Promise<Ijazah> {
    try {
      // Validate access
      this.validateRektorAkademikAccess(organization);

      logger.info(`Rejecting ijazah certificate with ID: ${ijazahId}`);

      // Get existing ijazah from blockchain
      const existingIjazahStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadIjazah",
          args: [ijazahId],
        }
      );

      if (!existingIjazahStr) {
        throw new Error(`Ijazah with ID: ${ijazahId} not found`);
      }

      const existingIjazah: Ijazah = JSON.parse(existingIjazahStr);

      // Check if ijazah is in correct status for rejection
      if (existingIjazah.Status !== IJAZAH_STATUS.MENUNGGU_TTD) {
        throw new Error(
          `Cannot reject ijazah with status: ${existingIjazah.Status}`
        );
      }

      // Update ijazah status to rejected
      const rejectedIjazah: Ijazah = {
        ...existingIjazah,
        Status: IJAZAH_STATUS.DITOLAK,
        UpdatedAt: new Date().toISOString(),
        // Add rejection reason if provided (you might want to add this field to the model)
        ...(rejectionReason && { rejectionReason }),
      };

      // Update in blockchain via chaincode
      logger.info("Updating rejected ijazah status in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateIjazah",
          args: [JSON.stringify(rejectedIjazah)],
        }
      );

      logger.info(
        `Ijazah certificate rejected successfully with ID: ${ijazahId}`
      );
      return JSON.parse(blockchainResult);
    } catch (error) {
      logger.error("Error rejecting ijazah certificate:", error);
      throw error;
    }
  }

  /**
   * Activate approved ijazah certificate (REKTOR only)
   * Changes status from "disetujui rektor" to "aktif"
   */
  async activateIjazah(
    organization: Organization,
    userToken: string,
    ijazahId: string
  ): Promise<Ijazah> {
    try {
      // Validate access
      this.validateRektorAkademikAccess(organization);

      logger.info(`Activating ijazah certificate with ID: ${ijazahId}`);

      // Get existing ijazah from blockchain
      const existingIjazahStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadIjazah",
          args: [ijazahId],
        }
      );

      if (!existingIjazahStr) {
        throw new Error(`Ijazah with ID: ${ijazahId} not found`);
      }

      const existingIjazah: Ijazah = JSON.parse(existingIjazahStr);

      // Check if ijazah is in correct status for activation
      if (existingIjazah.Status !== IJAZAH_STATUS.DISETUJUI) {
        throw new Error(
          `Cannot activate ijazah with status: ${existingIjazah.Status}. Must be 'disetujui rektor' first.`
        );
      }

      // Update ijazah status to active
      const activatedIjazah: Ijazah = {
        ...existingIjazah,
        Status: IJAZAH_STATUS.AKTIF,
        UpdatedAt: new Date().toISOString(),
      };

      // Update in blockchain via chaincode
      logger.info("Updating activated ijazah status in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateIjazah",
          args: [JSON.stringify(activatedIjazah)],
        }
      );

      logger.info(
        `Ijazah certificate activated successfully with ID: ${ijazahId}`
      );
      return JSON.parse(blockchainResult);
    } catch (error) {
      logger.error("Error activating ijazah certificate:", error);
      throw error;
    }
  }

  /**
   * Regenerate certificate PDF with current signature (REKTOR only)
   * Useful when signature is updated and certificates need to be regenerated
   */
  async regenerateCertificateWithSignature(
    organization: Organization,
    userToken: string,
    ijazahId: string,
    signatureId?: string
  ): Promise<Ijazah> {
    try {
      // Validate access
      this.validateRektorAkademikAccess(organization);

      logger.info(
        `Regenerating certificate with signature for ID: ${ijazahId}`
      );

      // Get existing ijazah from blockchain
      const existingIjazahStr = await fabloService.queryChaincode(
        organization,
        userToken,
        {
          method: "ReadIjazah",
          args: [ijazahId],
        }
      );

      if (!existingIjazahStr) {
        throw new Error(`Ijazah with ID: ${ijazahId} not found`);
      }

      const existingIjazah: Ijazah = JSON.parse(existingIjazahStr);

      // Can only regenerate approved or active certificates
      if (
        ![IJAZAH_STATUS.DISETUJUI, IJAZAH_STATUS.AKTIF].includes(
          existingIjazah.Status as any
        )
      ) {
        throw new Error(
          `Cannot regenerate certificate with status: ${existingIjazah.Status}`
        );
      }

      if (!existingIjazah.photoCID) {
        throw new Error("Photo file is required");
      }

      // Get signature to use
      let targetSignature: Signature;
      if (signatureId) {
        const signatureStr = await fabloService.queryChaincode(
          organization,
          userToken,
          {
            method: "ReadSignature",
            args: [signatureId],
          }
        );
        targetSignature = JSON.parse(signatureStr);
      } else if (existingIjazah.signatureID) {
        const signatureStr = await fabloService.queryChaincode(
          organization,
          userToken,
          {
            method: "ReadSignature",
            args: [existingIjazah.signatureID],
          }
        );
        targetSignature = JSON.parse(signatureStr);
      } else {
        const activeSignatureStr = await fabloService.queryChaincode(
          organization,
          userToken,
          {
            method: "GetActiveSignature",
            args: [],
          }
        );
        targetSignature = JSON.parse(activeSignatureStr);
      }

      const {
        photo: _photo,
        ipfsCID: _ipfsCID,
        signatureID: _signatureID,
        Status: _status,
        ...certificateData
      } = existingIjazah as any;

      // Generate new certificate PDF
      logger.info("Regenerating certificate PDF with updated signature...");
      const regeneratedCertificatePDF = await this.generateCertificatePDF(
        certificateData,
        existingIjazah.photoCID,
        targetSignature.CID
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
      logger.info("Uploading regenerated certificate PDF to IPFS...");
      const certificateResult = await ipfsClusterService.add(
        regeneratedCertificatePDF,
        {
          filename: `${ijazahId}_certificate_regenerated.pdf`,
          local: false,
        }
      );

      // Pin the regenerated certificate
      await ipfsClusterService.pin(certificateResult.cid);
      logger.info(
        `Regenerated certificate PDF uploaded and pinned with CID: ${certificateResult.cid}`
      );

      // Update ijazah data
      const regeneratedIjazah: Ijazah = {
        ...existingIjazah,
        ipfsCID: certificateResult.cid,
        signatureID: targetSignature.ID,
        UpdatedAt: new Date().toISOString(),
      };

      // Update in blockchain via chaincode
      logger.info("Updating regenerated ijazah data in blockchain...");
      const blockchainResult = await fabloService.invokeChaincode(
        organization,
        userToken,
        {
          method: "UpdateIjazah",
          args: [JSON.stringify(regeneratedIjazah)],
        }
      );

      logger.info(`Certificate regenerated successfully with ID: ${ijazahId}`);
      return JSON.parse(blockchainResult);
    } catch (error) {
      logger.error("Error regenerating certificate:", error);
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
        this.validateRektorAkademikAccess(organization);
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

      if (!updateData.CID) {
        const existingSignature = await this.getSignature(
          organization,
          userToken,
          signatureId
        );

        if (!existingSignature) {
          throw new Error("Signature not found");
        }

        updateData.CID = existingSignature.CID;
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
