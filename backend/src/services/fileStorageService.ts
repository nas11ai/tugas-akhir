import fs from "fs/promises";
import path from "path";
import { logger } from "../utils/logger";
import sharp from "sharp";

/**
 * Local File Storage Service
 * Handles storage of photos and signatures locally
 */
export class FileStorageService {
  private readonly uploadsDir: string;
  private readonly photosDir: string;
  private readonly signaturesDir: string;
  private initializationPromise: Promise<void>;

  constructor(baseDir: string = path.join(process.cwd(), "uploads")) {
    this.uploadsDir = baseDir;
    this.photosDir = path.join(this.uploadsDir, "photos");
    this.signaturesDir = path.join(this.uploadsDir, "signatures");

    this.initializationPromise = this.initializeDirectories();
  }

  /**
   * Initialize storage directories
   */
  private async initializeDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      await fs.mkdir(this.photosDir, { recursive: true });
      await fs.mkdir(this.signaturesDir, { recursive: true });
      logger.info("Storage directories initialized");
    } catch (error) {
      logger.error("Failed to initialize storage directories:", error);
      throw error;
    }
  }

  /**
   * Ensure directories are initialized before performing operations
   */
  private async ensureInitialized(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Resolve file path - handles both absolute paths and relative filenames
   */
  private resolveSignaturePath(fileNameOrPath: string): string {
    // If it's an absolute path, use it directly
    if (path.isAbsolute(fileNameOrPath)) {
      return fileNameOrPath;
    }
    // Otherwise, treat it as a filename relative to signatures directory
    return path.join(this.signaturesDir, fileNameOrPath);
  }

  /**
   * Resolve photo path - handles both absolute paths and relative filenames
   */
  private resolvePhotoPath(fileNameOrPath: string): string {
    // If it's an absolute path, use it directly
    if (path.isAbsolute(fileNameOrPath)) {
      return fileNameOrPath;
    }
    // Otherwise, treat it as a filename relative to photos directory
    return path.join(this.photosDir, fileNameOrPath);
  }

  /**
   * Save photo file locally
   */
  async savePhoto(buffer: Buffer, fileName: string): Promise<string> {
    await this.ensureInitialized();

    try {
      // Process and resize photo
      const processedBuffer = await sharp(buffer)
        .resize(496, 659, { fit: "fill" })
        .png()
        .toBuffer();

      const photoPath = path.join(this.photosDir, fileName);
      await fs.writeFile(photoPath, processedBuffer);

      logger.info(`Photo saved: ${fileName}`);
      return fileName; // Return relative filename
    } catch (error) {
      logger.error("Failed to save photo:", error);
      throw error;
    }
  }

  /**
   * Save signature file locally
   */
  async saveSignature(buffer: Buffer, fileName: string): Promise<string> {
    await this.ensureInitialized();

    try {
      // Process and resize signature
      const processedBuffer = await sharp(buffer)
        .resize(667, 276, { fit: "fill" })
        .png()
        .toBuffer();

      const signaturePath = path.join(this.signaturesDir, fileName);
      await fs.writeFile(signaturePath, processedBuffer);

      logger.info(`Signature saved: ${fileName}`);
      return fileName; // Return relative filename
    } catch (error) {
      logger.error("Failed to save signature:", error);
      throw error;
    }
  }

  /**
   * Get photo file
   */
  async getPhoto(fileNameOrPath: string): Promise<Buffer> {
    await this.ensureInitialized();

    try {
      const photoPath = this.resolvePhotoPath(fileNameOrPath);
      const buffer = await fs.readFile(photoPath);
      return buffer;
    } catch (error) {
      logger.error(`Failed to get photo ${fileNameOrPath}:`, error);
      throw new Error(`Photo not found: ${fileNameOrPath}`);
    }
  }

  /**
   * Get signature file
   */
  async getSignature(fileNameOrPath: string): Promise<Buffer> {
    await this.ensureInitialized();

    try {
      const signaturePath = this.resolveSignaturePath(fileNameOrPath);
      const buffer = await fs.readFile(signaturePath);
      return buffer;
    } catch (error) {
      logger.error(`Failed to get signature ${fileNameOrPath}:`, error);
      throw new Error(`Signature not found: ${fileNameOrPath}`);
    }
  }

  /**
   * Delete photo file
   */
  async deletePhoto(fileNameOrPath: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const photoPath = this.resolvePhotoPath(fileNameOrPath);
      await fs.unlink(photoPath);
      logger.info(`Photo deleted: ${fileNameOrPath}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to delete photo ${fileNameOrPath}:`, error);
      return false;
    }
  }

  /**
   * Delete signature file
   */
  async deleteSignature(fileNameOrPath: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const signaturePath = this.resolveSignaturePath(fileNameOrPath);
      await fs.unlink(signaturePath);
      logger.info(`Signature deleted: ${fileNameOrPath}`);
      return true;
    } catch (error) {
      logger.warn(`Failed to delete signature ${fileNameOrPath}:`, error);
      return false;
    }
  }

  /**
   * Check if photo exists
   */
  async photoExists(fileNameOrPath: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const photoPath = this.resolvePhotoPath(fileNameOrPath);
      await fs.access(photoPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if signature exists
   */
  async signatureExists(fileNameOrPath: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      const signaturePath = this.resolveSignaturePath(fileNameOrPath);
      await fs.access(signaturePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique filename
   */
  generateFileName(prefix: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = path.extname(originalName) || ".png";
    return `${prefix}_${timestamp}${extension}`;
  }

  /**
   * Get photo full path
   */
  getPhotoPath(fileNameOrPath: string): string {
    return this.resolvePhotoPath(fileNameOrPath);
  }

  /**
   * Get signature full path
   */
  getSignaturePath(fileNameOrPath: string): string {
    return this.resolveSignaturePath(fileNameOrPath);
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    photos: { count: number; totalSize: number };
    signatures: { count: number; totalSize: number };
  }> {
    await this.ensureInitialized();

    try {
      const [photoFiles, signatureFiles] = await Promise.all([
        fs.readdir(this.photosDir),
        fs.readdir(this.signaturesDir),
      ]);

      // Calculate photo stats
      let photoTotalSize = 0;
      for (const file of photoFiles) {
        try {
          const stats = await fs.stat(path.join(this.photosDir, file));
          photoTotalSize += stats.size;
        } catch (error) {
          logger.warn(`Failed to get stats for photo ${file}:`, error);
        }
      }

      // Calculate signature stats
      let signatureTotalSize = 0;
      for (const file of signatureFiles) {
        try {
          const stats = await fs.stat(path.join(this.signaturesDir, file));
          signatureTotalSize += stats.size;
        } catch (error) {
          logger.warn(`Failed to get stats for signature ${file}:`, error);
        }
      }

      return {
        photos: {
          count: photoFiles.length,
          totalSize: photoTotalSize,
        },
        signatures: {
          count: signatureFiles.length,
          totalSize: signatureTotalSize,
        },
      };
    } catch (error) {
      logger.error("Failed to get storage stats:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const fileStorageService = new FileStorageService();
