import fs from "fs/promises";
import path from "path";
import { FileStorageService } from "../../../src/services/fileStorageService";
import sharp from "sharp";

// Mock dependencies
jest.mock("fs/promises");
jest.mock("sharp");
jest.mock("../../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;
const mockSharp = sharp as jest.MockedFunction<typeof sharp>;

describe("FileStorageService", () => {
  let fileStorageService: FileStorageService;
  const testUploadsDir = path.join(process.cwd(), "test-uploads");

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock fs methods to succeed by default
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.readFile.mockResolvedValue(Buffer.from("test-data"));
    mockFs.unlink.mockResolvedValue(undefined);
    mockFs.access.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.stat.mockResolvedValue({ size: 1024 } as any);
    mockFs.rmdir.mockResolvedValue(undefined);

    // Mock sharp chain
    const mockSharpInstance = {
      resize: jest.fn().mockReturnThis(),
      png: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed-image")),
    };

    mockSharp.mockReturnValue(mockSharpInstance as any);

    // Create new instance for each test
    fileStorageService = new FileStorageService(testUploadsDir);
  });

  describe("initialization", () => {
    it("should create directories on initialization", async () => {
      // Wait for async initialization to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFs.mkdir).toHaveBeenCalledWith(testUploadsDir, {
        recursive: true,
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testUploadsDir, "photos"),
        { recursive: true }
      );
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(testUploadsDir, "signatures"),
        { recursive: true }
      );
    });

    it("should handle directory initialization errors", async () => {
      // Clear previous mocks
      jest.clearAllMocks();

      const error = new Error("Permission denied");
      mockFs.mkdir.mockRejectedValue(error);

      // Mock logger to capture error calls
      const { logger } = require("../../../src/utils/logger");

      // Create the service instance
      const failingService = new FileStorageService(testUploadsDir);

      // Try to use the service - this should trigger the initialization and fail
      await expect(failingService.savePhoto(Buffer.from("test"), "test.png"))
        .rejects.toThrow("Permission denied");

      // Verify mkdir was called and failed
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith("Failed to initialize storage directories:", error);
    });

    it("should use default upload directory when no baseDir provided", () => {
      const defaultService = new FileStorageService();
      const expectedDefaultPath = path.join(process.cwd(), "uploads");

      expect(defaultService.getPhotoPath("test.png")).toBe(
        path.join(expectedDefaultPath, "photos", "test.png")
      );
    });
  });

  describe("savePhoto", () => {
    it("should save and process photo successfully", async () => {
      const testBuffer = Buffer.from("test-image-data");
      const filename = "test-photo.png";

      const result = await fileStorageService.savePhoto(testBuffer, filename);

      expect(mockSharp).toHaveBeenCalledWith(testBuffer);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testUploadsDir, "photos", filename),
        Buffer.from("processed-image")
      );
      expect(result).toBe(filename);
    });

    it("should process photo with correct dimensions", async () => {
      const testBuffer = Buffer.from("test-image-data");
      const filename = "test-photo.png";

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from("processed-image")),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await fileStorageService.savePhoto(testBuffer, filename);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(496, 659, {
        fit: "fill",
      });
      expect(mockSharpInstance.png).toHaveBeenCalled();
    });

    it("should handle photo processing errors", async () => {
      const testBuffer = Buffer.from("test-image-data");
      const filename = "test-photo.png";
      const error = new Error("Sharp processing failed");

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(error),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await expect(
        fileStorageService.savePhoto(testBuffer, filename)
      ).rejects.toThrow("Sharp processing failed");
    });

    it("should handle file write errors", async () => {
      const testBuffer = Buffer.from("test-image-data");
      const filename = "test-photo.png";
      const error = new Error("Write permission denied");

      mockFs.writeFile.mockRejectedValue(error);

      await expect(
        fileStorageService.savePhoto(testBuffer, filename)
      ).rejects.toThrow("Write permission denied");
    });
  });

  describe("saveSignature", () => {
    it("should save and process signature successfully", async () => {
      const testBuffer = Buffer.from("test-signature-data");
      const filename = "test-signature.png";

      const result = await fileStorageService.saveSignature(
        testBuffer,
        filename
      );

      expect(mockSharp).toHaveBeenCalledWith(testBuffer);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        path.join(testUploadsDir, "signatures", filename),
        Buffer.from("processed-image")
      );
      expect(result).toBe(filename);
    });

    it("should process signature with correct dimensions", async () => {
      const testBuffer = Buffer.from("test-signature-data");
      const filename = "test-signature.png";

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest
          .fn()
          .mockResolvedValue(Buffer.from("processed-signature")),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await fileStorageService.saveSignature(testBuffer, filename);

      expect(mockSharpInstance.resize).toHaveBeenCalledWith(667, 276, {
        fit: "fill",
      });
      expect(mockSharpInstance.png).toHaveBeenCalled();
    });

    it("should handle signature processing errors", async () => {
      const testBuffer = Buffer.from("test-signature-data");
      const filename = "test-signature.png";
      const error = new Error("Sharp processing failed");

      const mockSharpInstance = {
        resize: jest.fn().mockReturnThis(),
        png: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(error),
      };

      mockSharp.mockReturnValue(mockSharpInstance as any);

      await expect(
        fileStorageService.saveSignature(testBuffer, filename)
      ).rejects.toThrow("Sharp processing failed");
    });
  });

  describe("getPhoto", () => {
    it("should retrieve photo successfully", async () => {
      const filename = "test-photo.png";
      const expectedBuffer = Buffer.from("photo-data");

      mockFs.readFile.mockResolvedValue(expectedBuffer);

      const result = await fileStorageService.getPhoto(filename);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testUploadsDir, "photos", filename)
      );
      expect(result).toBe(expectedBuffer);
    });

    it("should handle absolute path for photo", async () => {
      const absolutePath = "/absolute/path/to/photo.png";
      const expectedBuffer = Buffer.from("photo-data");

      mockFs.readFile.mockResolvedValue(expectedBuffer);

      const result = await fileStorageService.getPhoto(absolutePath);

      expect(mockFs.readFile).toHaveBeenCalledWith(absolutePath);
      expect(result).toBe(expectedBuffer);
    });

    it("should handle photo not found error", async () => {
      const filename = "nonexistent-photo.png";
      const error = new Error("ENOENT: no such file or directory");

      mockFs.readFile.mockRejectedValue(error);

      await expect(fileStorageService.getPhoto(filename)).rejects.toThrow(
        "Photo not found: nonexistent-photo.png"
      );
    });
  });

  describe("getSignature", () => {
    it("should retrieve signature successfully", async () => {
      const filename = "test-signature.png";
      const expectedBuffer = Buffer.from("signature-data");

      mockFs.readFile.mockResolvedValue(expectedBuffer);

      const result = await fileStorageService.getSignature(filename);

      expect(mockFs.readFile).toHaveBeenCalledWith(
        path.join(testUploadsDir, "signatures", filename)
      );
      expect(result).toBe(expectedBuffer);
    });

    it("should handle absolute path for signature", async () => {
      const absolutePath = "/absolute/path/to/signature.png";
      const expectedBuffer = Buffer.from("signature-data");

      mockFs.readFile.mockResolvedValue(expectedBuffer);

      const result = await fileStorageService.getSignature(absolutePath);

      expect(mockFs.readFile).toHaveBeenCalledWith(absolutePath);
      expect(result).toBe(expectedBuffer);
    });

    it("should handle signature not found error", async () => {
      const filename = "nonexistent-signature.png";
      const error = new Error("ENOENT: no such file or directory");

      mockFs.readFile.mockRejectedValue(error);

      await expect(fileStorageService.getSignature(filename)).rejects.toThrow(
        "Signature not found: nonexistent-signature.png"
      );
    });
  });

  describe("deletePhoto", () => {
    it("should delete photo successfully", async () => {
      const filename = "test-photo.png";

      const result = await fileStorageService.deletePhoto(filename);

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testUploadsDir, "photos", filename)
      );
      expect(result).toBe(true);
    });

    it("should handle absolute path for photo deletion", async () => {
      const absolutePath = "/absolute/path/to/photo.png";

      const result = await fileStorageService.deletePhoto(absolutePath);

      expect(mockFs.unlink).toHaveBeenCalledWith(absolutePath);
      expect(result).toBe(true);
    });

    it("should handle photo deletion error gracefully", async () => {
      const filename = "test-photo.png";
      const error = new Error("File not found");

      mockFs.unlink.mockRejectedValue(error);

      const result = await fileStorageService.deletePhoto(filename);

      expect(result).toBe(false);
    });
  });

  describe("deleteSignature", () => {
    it("should delete signature successfully", async () => {
      const filename = "test-signature.png";

      const result = await fileStorageService.deleteSignature(filename);

      expect(mockFs.unlink).toHaveBeenCalledWith(
        path.join(testUploadsDir, "signatures", filename)
      );
      expect(result).toBe(true);
    });

    it("should handle absolute path for signature deletion", async () => {
      const absolutePath = "/absolute/path/to/signature.png";

      const result = await fileStorageService.deleteSignature(absolutePath);

      expect(mockFs.unlink).toHaveBeenCalledWith(absolutePath);
      expect(result).toBe(true);
    });

    it("should handle signature deletion error gracefully", async () => {
      const filename = "test-signature.png";
      const error = new Error("File not found");

      mockFs.unlink.mockRejectedValue(error);

      const result = await fileStorageService.deleteSignature(filename);

      expect(result).toBe(false);
    });
  });

  describe("photoExists", () => {
    it("should return true when photo exists", async () => {
      const filename = "existing-photo.png";

      const result = await fileStorageService.photoExists(filename);

      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(testUploadsDir, "photos", filename)
      );
      expect(result).toBe(true);
    });

    it("should return false when photo does not exist", async () => {
      const filename = "nonexistent-photo.png";
      const error = new Error("ENOENT: no such file or directory");

      mockFs.access.mockRejectedValue(error);

      const result = await fileStorageService.photoExists(filename);

      expect(result).toBe(false);
    });

    it("should handle absolute path for photo existence check", async () => {
      const absolutePath = "/absolute/path/to/photo.png";

      const result = await fileStorageService.photoExists(absolutePath);

      expect(mockFs.access).toHaveBeenCalledWith(absolutePath);
      expect(result).toBe(true);
    });
  });

  describe("signatureExists", () => {
    it("should return true when signature exists", async () => {
      const filename = "existing-signature.png";

      const result = await fileStorageService.signatureExists(filename);

      expect(mockFs.access).toHaveBeenCalledWith(
        path.join(testUploadsDir, "signatures", filename)
      );
      expect(result).toBe(true);
    });

    it("should return false when signature does not exist", async () => {
      const filename = "nonexistent-signature.png";
      const error = new Error("ENOENT: no such file or directory");

      mockFs.access.mockRejectedValue(error);

      const result = await fileStorageService.signatureExists(filename);

      expect(result).toBe(false);
    });

    it("should handle absolute path for signature existence check", async () => {
      const absolutePath = "/absolute/path/to/signature.png";

      const result = await fileStorageService.signatureExists(absolutePath);

      expect(mockFs.access).toHaveBeenCalledWith(absolutePath);
      expect(result).toBe(true);
    });
  });

  describe("generateFileName", () => {
    it("should generate unique filename with prefix and extension", () => {
      const prefix = "photo_ijazah_123";
      const originalName = "student-photo.jpg";

      // Mock Date.now to return consistent timestamp
      const mockTimestamp = 1640995200000; // 2022-01-01T00:00:00.000Z
      const dateSpy = jest.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      const result = fileStorageService.generateFileName(prefix, originalName);

      expect(result).toBe(`${prefix}_${mockTimestamp}.jpg`);

      // Restore Date.now
      dateSpy.mockRestore();
    });

    it("should use .png as default extension when original has no extension", () => {
      const prefix = "signature_rektor";
      const originalName = "signature";

      const mockTimestamp = 1640995200000;
      const dateSpy = jest.spyOn(Date, "now").mockReturnValue(mockTimestamp);

      const result = fileStorageService.generateFileName(prefix, originalName);

      expect(result).toBe(`${prefix}_${mockTimestamp}.png`);

      dateSpy.mockRestore();
    });

    it("should generate different filenames for same input at different times", () => {
      const prefix = "test";
      const originalName = "image.png";

      const filename1 = fileStorageService.generateFileName(
        prefix,
        originalName
      );

      // Mock a different timestamp
      const dateSpy = jest
        .spyOn(Date, "now")
        .mockReturnValue(Date.now() + 1000);

      const filename2 = fileStorageService.generateFileName(
        prefix,
        originalName
      );

      expect(filename1).not.toBe(filename2);

      dateSpy.mockRestore();
    });
  });

  describe("getPhotoPath and getSignaturePath", () => {
    it("should return correct photo path for filename", () => {
      const filename = "test-photo.png";
      const result = fileStorageService.getPhotoPath(filename);

      expect(result).toBe(path.join(testUploadsDir, "photos", filename));
    });

    it("should return absolute path for photo when given absolute path", () => {
      const absolutePath = "/absolute/path/to/photo.png";
      const result = fileStorageService.getPhotoPath(absolutePath);

      expect(result).toBe(absolutePath);
    });

    it("should return correct signature path for filename", () => {
      const filename = "test-signature.png";
      const result = fileStorageService.getSignaturePath(filename);

      expect(result).toBe(path.join(testUploadsDir, "signatures", filename));
    });

    it("should return absolute path for signature when given absolute path", () => {
      const absolutePath = "/absolute/path/to/signature.png";
      const result = fileStorageService.getSignaturePath(absolutePath);

      expect(result).toBe(absolutePath);
    });
  });

  describe("getStorageStats", () => {
    it("should return storage statistics successfully", async () => {
      const photoFiles = ["photo1.png", "photo2.png"];
      const signatureFiles = ["signature1.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock file stats
      const mockStats = { size: 1024 };
      mockFs.stat.mockResolvedValue(mockStats as any);

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 2,
          totalSize: 2048, // 2 files * 1024 bytes
        },
        signatures: {
          count: 1,
          totalSize: 1024, // 1 file * 1024 bytes
        },
      });
    });

    it("should handle errors when getting photo file stats", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png", "photo2.png"];
      const signatureFiles = ["signature1.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock logger to capture warning calls
      const { logger } = require("../../../src/utils/logger");

      // Mock stat to fail for both photo files, succeed for signature
      mockFs.stat
        .mockRejectedValueOnce(new Error("Photo1 access error"))
        .mockRejectedValueOnce(new Error("Photo2 access error"))
        .mockResolvedValueOnce({ size: 512 } as any);

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 2,
          totalSize: 0, // Both photo files failed to get size
        },
        signatures: {
          count: 1,
          totalSize: 512,
        },
      });

      // Verify logger.warn was called for each failed photo
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for photo photo1.png:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for photo photo2.png:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should handle errors when getting signature file stats", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png"];
      const signatureFiles = ["signature1.png", "signature2.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock logger to capture warning calls
      const { logger } = require("../../../src/utils/logger");

      // Mock stat to succeed for photo, fail for both signatures
      mockFs.stat
        .mockResolvedValueOnce({ size: 1024 } as any)
        .mockRejectedValueOnce(new Error("Signature1 access error"))
        .mockRejectedValueOnce(new Error("Signature2 access error"));

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 1,
          totalSize: 1024,
        },
        signatures: {
          count: 2,
          totalSize: 0, // Both signature files failed to get size
        },
      });

      // Verify logger.warn was called for each failed signature
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for signature signature1.png:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for signature signature2.png:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should handle mixed success and failure for file stats", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png", "photo2.png", "photo3.png"];
      const signatureFiles = ["signature1.png", "signature2.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock logger to capture warning calls
      const { logger } = require("../../../src/utils/logger");

      // Mock stat: photo1 succeeds, photo2 fails, photo3 succeeds
      // signature1 fails, signature2 succeeds
      mockFs.stat
        .mockResolvedValueOnce({ size: 500 } as any)      // photo1.png
        .mockRejectedValueOnce(new Error("Photo2 error"))  // photo2.png
        .mockResolvedValueOnce({ size: 300 } as any)      // photo3.png
        .mockRejectedValueOnce(new Error("Signature1 error")) // signature1.png
        .mockResolvedValueOnce({ size: 200 } as any);     // signature2.png

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 3,
          totalSize: 800, // 500 + 0 + 300
        },
        signatures: {
          count: 2,
          totalSize: 200, // 0 + 200
        },
      });

      // Verify logger.warn was called for failed files only
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for photo photo2.png:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for signature signature1.png:",
        expect.any(Error)
      );
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should handle all photo files failing to get stats", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png", "photo2.png"];
      const signatureFiles = ["signature1.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock logger to capture warning calls
      const { logger } = require("../../../src/utils/logger");

      // All photo files fail, signature succeeds
      mockFs.stat
        .mockRejectedValueOnce(new Error("Photo1 permission denied"))
        .mockRejectedValueOnce(new Error("Photo2 file corrupted"))
        .mockResolvedValueOnce({ size: 1000 } as any);

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 2,
          totalSize: 0, // All failed
        },
        signatures: {
          count: 1,
          totalSize: 1000,
        },
      });

      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should handle all signature files failing to get stats", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png"];
      const signatureFiles = ["signature1.png", "signature2.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock logger to capture warning calls
      const { logger } = require("../../../src/utils/logger");

      // Photo succeeds, all signature files fail
      mockFs.stat
        .mockResolvedValueOnce({ size: 2000 } as any)
        .mockRejectedValueOnce(new Error("Signature1 not found"))
        .mockRejectedValueOnce(new Error("Signature2 access denied"));

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 1,
          totalSize: 2000,
        },
        signatures: {
          count: 2,
          totalSize: 0, // All failed
        },
      });

      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it("should handle directory read errors", async () => {
      const error = new Error("Directory not accessible");
      mockFs.readdir.mockRejectedValue(error);

      await expect(fileStorageService.getStorageStats()).rejects.toThrow(
        "Directory not accessible"
      );

      // Mock logger to capture error calls
      const { logger } = require("../../../src/utils/logger");
      expect(logger.error).toHaveBeenCalledWith("Failed to get storage stats:", error);
    });

    it("should handle empty directories", async () => {
      mockFs.readdir
        .mockResolvedValueOnce([] as any)
        .mockResolvedValueOnce([] as any);

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 0,
          totalSize: 0,
        },
        signatures: {
          count: 0,
          totalSize: 0,
        },
      });
    });

    it("should handle photos directory read success but signatures directory read failure", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png"];
      const directoryError = new Error("Signatures directory not accessible");

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockRejectedValueOnce(directoryError);

      await expect(fileStorageService.getStorageStats()).rejects.toThrow(
        "Signatures directory not accessible"
      );

      // Mock logger to capture error calls
      const { logger } = require("../../../src/utils/logger");
      expect(logger.error).toHaveBeenCalledWith("Failed to get storage stats:", directoryError);
    });

    it("should handle specific file system errors during stat operations", async () => {
      jest.clearAllMocks();

      const photoFiles = ["photo1.png"];
      const signatureFiles = ["signature1.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock logger to capture warning calls
      const { logger } = require("../../../src/utils/logger");

      // Mock different types of file system errors
      const enoentError = new Error("ENOENT: no such file or directory");
      enoentError.name = "ENOENT";

      const epermError = new Error("EPERM: operation not permitted");
      epermError.name = "EPERM";

      mockFs.stat
        .mockRejectedValueOnce(enoentError)
        .mockRejectedValueOnce(epermError);

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 1,
          totalSize: 0,
        },
        signatures: {
          count: 1,
          totalSize: 0,
        },
      });

      // Verify specific error types are logged
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for photo photo1.png:",
        enoentError
      );
      expect(logger.warn).toHaveBeenCalledWith(
        "Failed to get stats for signature signature1.png:",
        epermError
      );
    });
  });

  // NEW TEST: Testing the singleton export
  describe("singleton export", () => {
    it("should export a singleton instance", () => {
      // This test requires importing the singleton instance
      // Since we can't modify imports in this test file easily,
      // this would typically be in a separate test file
      const { fileStorageService: singletonInstance } = require("../../../src/services/fileStorageService");
      expect(singletonInstance).toBeInstanceOf(FileStorageService);
    });
  });

  // ADDITIONAL TESTS for better coverage
  describe("edge cases", () => {
    it("should handle constructor with default parameter", () => {
      // Test the default constructor parameter
      const defaultService = new FileStorageService();
      const expectedDefaultPath = path.join(process.cwd(), "uploads");

      expect(defaultService.getPhotoPath("test.png")).toBe(
        path.join(expectedDefaultPath, "photos", "test.png")
      );
    });

    it("should handle empty filename in generateFileName", () => {
      const prefix = "test";
      const originalName = "";

      const result = fileStorageService.generateFileName(prefix, originalName);

      // Should use .png as default extension
      expect(result).toMatch(/^test_\d+\.png$/);
    });

    it("should handle filename with multiple dots", () => {
      const prefix = "test";
      const originalName = "file.name.with.dots.jpg";

      const result = fileStorageService.generateFileName(prefix, originalName);

      // Should use the last extension
      expect(result).toMatch(/^test_\d+\.jpg$/);
    });
  });
});