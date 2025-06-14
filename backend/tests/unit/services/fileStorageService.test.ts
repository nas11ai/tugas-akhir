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

    it("should handle errors when getting file stats", async () => {
      const photoFiles = ["photo1.png"];
      const signatureFiles = ["signature1.png"];

      mockFs.readdir
        .mockResolvedValueOnce(photoFiles as any)
        .mockResolvedValueOnce(signatureFiles as any);

      // Mock stat to fail for one file, succeed for another
      mockFs.stat
        .mockRejectedValueOnce(new Error("File access error"))
        .mockResolvedValueOnce({ size: 512 } as any);

      const result = await fileStorageService.getStorageStats();

      expect(result).toEqual({
        photos: {
          count: 1,
          totalSize: 0, // Failed to get size
        },
        signatures: {
          count: 1,
          totalSize: 512,
        },
      });
    });

    it("should handle directory read errors", async () => {
      const error = new Error("Directory not accessible");
      mockFs.readdir.mockRejectedValue(error);

      await expect(fileStorageService.getStorageStats()).rejects.toThrow(
        "Directory not accessible"
      );
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
  });
});
