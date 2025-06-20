// tests/unit/services/fabricService.test.ts
import { FabricService } from "../../../src/services/fabricService";
import { Organization } from "../../../src/models/user";
import { TestDataGenerator } from "../../helpers";
import { mockFabloService, mockIpfsClusterService } from "../../mocks";
import { fabloService } from "../../../src/services/fabloService";
import { ipfsClusterService } from "../../../src/services/ipfsClusterService";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { Ijazah, Signature, SignatureInput } from "../../../src/models/ijazah";
import path from "path";
import { fileStorageService } from "../../../src/services/fileStorageService";
import { logger } from "../../../src/utils/logger";

dotenv.config();

describe("FabricService", () => {
  let fabricService: FabricService;
  let mockUserToken: string;
  let existingIjazah: Ijazah;
  let existingSignature: Signature;
  let signatureFile: Buffer;
  let photoFile: Buffer;
  let savedSignatureFilename: string;

  const signatureTestFilePath = path.resolve(
    __dirname,
    "../../assets/test-signature.png"
  );

  beforeAll(async () => {
    mockUserToken = await fabloService.enrollUser(
      Organization.AKADEMIK,
      process.env.ADMIN_USERNAME || "admin",
      process.env.ADMIN_PASSWORD || "adminpw"
    );
    fabricService = new FabricService();

    signatureFile = await TestDataGenerator.generateMockSignatureBuffer();

    savedSignatureFilename = await fileStorageService.saveSignature(
      signatureFile,
      fileStorageService.generateFileName("test_signature", "test-signature.png")
    );

    // Mock active signature
    existingSignature = await fabricService.createSignature(
      Organization.AKADEMIK,
      mockUserToken,
      {
        ID: `signature_test_${uuidv4()}_${Date.now()}`,
        filePath: savedSignatureFilename,
        IsActive: true,
      }
    );

    logger.debug(`Signature data: ${JSON.stringify(existingSignature)}`);

    const ijazahData = TestDataGenerator.generateIjazahData();
    photoFile = await TestDataGenerator.generateMockPhotoBuffer();

    // Act
    existingIjazah = await fabricService.createIjazah(
      Organization.AKADEMIK,
      mockUserToken,
      ijazahData,
      photoFile
    );
  });

  beforeEach(async () => {
    // Renew user token
    mockUserToken = await fabloService.enrollUser(
      Organization.AKADEMIK,
      process.env.ADMIN_USERNAME || "admin",
      process.env.ADMIN_PASSWORD || "adminpw"
    );

    // Clear mock data before each test
    mockFabloService.clearMockData();
    mockIpfsClusterService.clearMockData();

    // Reset all mocks
    jest.restoreAllMocks();
  });

  afterEach(() => {
    // Clean up any remaining mocks
    jest.restoreAllMocks();
  });

  describe("findMahasiswaByNim", () => {
    it("should return mahasiswa by NIM", () => {
      // Arrange
      const nim = "07201060";

      // Act
      const result = fabricService.findMahasiswaByNim(nim);

      // Assert
      expect(result).toBeDefined();
      expect(result?.nomorIndukMahasiswa).toBe(nim);
    });

    it("should return undefined for non-existent mahasiswa by NIM", () => {
      // Act
      const result = fabricService.findMahasiswaByNim("non-existent-nim");

      // Assert
      expect(result).toBeUndefined();
    });

    // Additional edge cases for findMahasiswaByNim
    it("should return undefined for empty NIM", () => {
      const result = fabricService.findMahasiswaByNim("");
      expect(result).toBeUndefined();
    });

    it("should return undefined for null NIM", () => {
      const result = fabricService.findMahasiswaByNim(null as any);
      expect(result).toBeUndefined();
    });
  });

  describe("createIjazah", () => {
    it("should create ijazah certificate successfully", async () => {
      // Arrange
      const ijazahData = TestDataGenerator.generateIjazahData();

      // Act
      const result = await fabricService.createIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        ijazahData,
        photoFile
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.nama).toBe(ijazahData.nama);
      expect(result.programStudi).toBe(ijazahData.programStudi);
      expect(result.ID).toMatch(/^ijazah_/);
    });

    it("should throw error when photo is missing", async () => {
      // Arrange
      const ijazahData = TestDataGenerator.generateIjazahData();

      // Act & Assert
      await expect(
        fabricService.createIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          ijazahData,
        )
      ).rejects.toThrow("Photo is required");
    });
  });

  describe("updateIjazah", () => {
    it("should update ijazah certificate successfully", async () => {
      // Arrange
      const updateData: Partial<Ijazah> = {
        nama: "Updated Graduate Name",
        programStudi: "Updated Program",
      };

      // Act
      const result = await fabricService.updateIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        existingIjazah.ID,
        updateData,
        photoFile
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.nama).toBe(updateData.nama);
      expect(result.programStudi).toBe(updateData.programStudi);
      expect(result.UpdatedAt).toBeDefined();
    });
  });

  describe("getIjazah", () => {
    it("should get ijazah certificate by ID", async () => {
      // Act
      const result = await fabricService.getIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        existingIjazah.ID
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.ID).toBe(existingIjazah.ID);
      expect(result.nama).toBe("Updated Graduate Name");
    });

    it("should throw error when ijazah not found", async () => {
      jest
        .spyOn(fabloService, "queryChaincode")
        .mockImplementation(async (org, token, { method, args }) => {
          if (method === "ReadIjazah" && args[0] === "non-existent-id") {
            return null;
          }
          return "";
        });

      await expect(
        fabricService.getIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          "non-existent-id"
        )
      ).rejects.toThrow("Ijazah not found");
    });
  });

  describe("deleteIjazah", () => {
    it("should delete ijazah certificate successfully", async () => {
      // Act
      const result = await fabricService.deleteIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        existingIjazah.ID
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Signature Management", () => {
    describe("createSignature", () => {
      it("should create signature successfully", async () => {
        // Arrange
        const signatureData = TestDataGenerator.generateSignatureData();

        // Save signature file first
        const newSignatureFilename = await fileStorageService.saveSignature(
          signatureFile,
          fileStorageService.generateFileName("new_test_signature", "new-signature.png")
        );

        signatureData.filePath = newSignatureFilename; // Use the saved filename

        // Act
        const result = await fabricService.createSignature(
          Organization.AKADEMIK,
          mockUserToken,
          signatureData
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.ID).toBe(signatureData.ID);
        expect(result.filePath).toBe(signatureData.filePath);
      });
    });

    describe("updateSignature", () => {
      it("should update signature successfully", async () => {
        // Arrange
        const updateData: Partial<SignatureInput> = {
          filePath: signatureTestFilePath,
          IsActive: false,
        };

        // Act
        const result = await fabricService.updateSignature(
          Organization.AKADEMIK,
          mockUserToken,
          existingSignature.ID,
          updateData
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.filePath).toBe(signatureTestFilePath);
        expect(result.IsActive).toBe(false);
      });
    });

    describe("setActiveSignature", () => {
      it("should set signature as active", async () => {
        // Act
        const result = await fabricService.setActiveSignature(
          Organization.AKADEMIK,
          mockUserToken,
          existingSignature.ID
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.IsActive).toBe(true);
      });
    });

    describe("deleteSignature", () => {
      it("should delete signature successfully", async () => {
        // Act
        const result = await fabricService.deleteSignature(
          Organization.AKADEMIK,
          mockUserToken,
          existingSignature.ID
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.success).toBe(true);
      });
    });
  });

  // Additional test cases to improve coverage
  describe("Access Control Validation", () => {
    it("should throw error when non-AKADEMIK organization tries to create ijazah", async () => {
      const ijazahData = TestDataGenerator.generateIjazahData();

      await expect(
        fabricService.createIjazah(
          Organization.REKTOR, // Wrong organization
          mockUserToken,
          ijazahData,
          photoFile
        )
      ).rejects.toThrow("Access denied: Only AKADEMIK organization can manage ijazah certificates");
    });

    it("should throw error when non-AKADEMIK organization tries to update ijazah", async () => {
      const updateData: Partial<Ijazah> = {
        nama: "Updated Name"
      };

      await expect(
        fabricService.updateIjazah(
          Organization.REKTOR, // Wrong organization
          mockUserToken,
          existingIjazah.ID,
          updateData,
          photoFile
        )
      ).rejects.toThrow("Access denied: Only AKADEMIK organization can manage ijazah certificates");
    });

    it("should throw error when non-AKADEMIK organization tries to delete ijazah", async () => {
      await expect(
        fabricService.deleteIjazah(
          Organization.REKTOR, // Wrong organization
          mockUserToken,
          existingIjazah.ID
        )
      ).rejects.toThrow("Access denied: Only AKADEMIK organization can manage ijazah certificates");
    });

    // Fix: Use existing Organization enum values instead of non-existent MAHASISWA
    it("should throw error when unauthorized organization tries to manage signatures", async () => {
      const signatureData = TestDataGenerator.generateSignatureData();

      // Assuming Organization enum only has AKADEMIK and REKTOR
      // Create a test with an invalid organization by casting
      const invalidOrg = "INVALID_ORG" as Organization;

      await expect(
        fabricService.createSignature(
          invalidOrg,
          mockUserToken,
          signatureData
        )
      ).rejects.toThrow("Access denied: Only REKTOR and AKADEMIK organization can manage signatures");
    });
  });

  describe("Error Handling", () => {
    it("should handle PDF generation failure gracefully", async () => {
      const ijazahData = TestDataGenerator.generateIjazahData();

      // Mock active signature first (this is called before PDF generation)
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      // Mock fs.readFile to throw error for template
      jest.spyOn(require('fs/promises'), 'readFile')
        .mockRejectedValueOnce(new Error("Template file not found"));

      await expect(
        fabricService.createIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          ijazahData,
          photoFile
        )
      ).rejects.toThrow("Failed to generate certificate PDF");
    });

    it("should handle IPFS upload failure", async () => {
      const ijazahData = TestDataGenerator.generateIjazahData();

      // Mock active signature first
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      // Mock the actual IPFS cluster service instead of the mock
      jest.spyOn(ipfsClusterService, 'add')
        .mockRejectedValueOnce(new Error("IPFS upload failed"));

      await expect(
        fabricService.createIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          ijazahData,
          photoFile
        )
      ).rejects.toThrow("IPFS upload failed");
    });

    it("should handle blockchain invocation failure", async () => {
      const ijazahData = TestDataGenerator.generateIjazahData();

      // Mock active signature first
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      // Mock IPFS upload success
      jest.spyOn(ipfsClusterService, 'add')
        .mockResolvedValueOnce({ cid: 'test-cid', url: 'http://test-url' });
      jest.spyOn(ipfsClusterService, 'pin')
        .mockResolvedValueOnce(true);

      // Mock fabric service to throw error
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockRejectedValueOnce(new Error("Blockchain network error"));

      await expect(
        fabricService.createIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          ijazahData,
          photoFile
        )
      ).rejects.toThrow("Blockchain network error");
    });
  });

  describe("File Storage Edge Cases", () => {
    it("should handle missing photo file during update", async () => {
      const updateData: Partial<Ijazah> = {
        nama: "Updated Name"
      };

      // Mock existing ijazah
      const mockExistingIjazah = {
        ...existingIjazah,
        photoPath: "existing-photo-path.png"
      };

      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(mockExistingIjazah)) // Get existing ijazah
        .mockResolvedValueOnce(JSON.stringify(existingSignature)); // Get active signature

      // Mock PDF generation to avoid file I/O issues
      jest.spyOn(FabricService.prototype as any, 'generateCertificatePDF')
        .mockResolvedValueOnce(Buffer.from("mock-pdf-content"));

      jest.spyOn(ipfsClusterService, 'unpin')
        .mockResolvedValueOnce(true);
      jest.spyOn(ipfsClusterService, 'add')
        .mockResolvedValueOnce({ cid: 'updated-cid', url: 'http://updated-url' });
      jest.spyOn(ipfsClusterService, 'pin')
        .mockResolvedValueOnce(true);

      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ ...mockExistingIjazah, ...updateData }));

      // Don't provide photoFile, should use existing
      const result = await fabricService.updateIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        existingIjazah.ID,
        updateData
        // No photoFile parameter
      );

      expect(result).toBeDefined();
      expect(result.photoPath).toBeDefined(); // Should retain existing photo
    });

    it("should handle file deletion errors during cleanup", async () => {
      // Create a test ijazah for deletion
      const testIjazahId = "test-ijazah-for-deletion";
      const testIjazah = {
        ...existingIjazah,
        ID: testIjazahId,
        ipfsCID: "test-cid",
        photoPath: "test-photo-path.png"
      };

      // Mock getting ijazah data
      jest.spyOn(fabricService, 'getIjazah')
        .mockResolvedValueOnce(testIjazah);

      // Mock IPFS unpin success
      jest.spyOn(ipfsClusterService, 'unpin')
        .mockResolvedValueOnce(true);

      // Mock file deletion to throw error
      jest.spyOn(fileStorageService, 'deletePhoto')
        .mockRejectedValueOnce(new Error("File deletion failed"));

      // Mock blockchain deletion success
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted successfully" }));

      // Should not fail the main operation due to cleanup errors
      const result = await fabricService.deleteIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        testIjazahId
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Signature Edge Cases", () => {
    it("should handle missing active signature", async () => {
      // Mock no active signature available
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce('null'); // No active signature

      const ijazahData = TestDataGenerator.generateIjazahData();

      await expect(
        fabricService.createIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          ijazahData,
          photoFile
        )
      ).rejects.toThrow(); // Should fail without active signature
    });

    it("should handle signature update without filePath", async () => {
      const updateData: Partial<SignatureInput> = {
        IsActive: false
        // No filePath provided
      };

      // Mock getting existing signature
      jest.spyOn(fabricService, 'getSignature')
        .mockResolvedValueOnce(existingSignature);

      // Mock the update operation
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({
          ...existingSignature,
          ...updateData,
          filePath: existingSignature.filePath // Should retain existing path
        }));

      const result = await fabricService.updateSignature(
        Organization.AKADEMIK,
        mockUserToken,
        existingSignature.ID,
        updateData
      );

      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined(); // Should retain existing path
    });
  });

  describe("Utility Functions", () => {
    it("should return null for empty IPFS CID", () => {
      const result = fabricService.getCertificateDownloadUrl("");
      expect(result).toBeNull();
    });

    it("should return null for null IPFS CID", () => {
      const result = fabricService.getCertificateDownloadUrl(null as any);
      expect(result).toBeNull();
    });

    it("should return proper download URL for valid CID", () => {
      const cid = "QmTest123";
      const result = fabricService.getCertificateDownloadUrl(cid);
      expect(result).toContain(cid);
      expect(result).toMatch(/^https?:\/\/.+\/ipfs\/.+/);
    });
  });

  describe("Health Check", () => {
    it("should return overall false when fabric is down", async () => {
      // Mock fabric health check failure
      jest.spyOn(fabloService, 'healthCheck')
        .mockResolvedValueOnce({ akademik: false, rektor: false });

      const result = await fabricService.healthCheck();

      expect(result.overall).toBe(false);
      expect(result.fabric.akademik).toBe(false);
      expect(result.fabric.rektor).toBe(false);
    });

    it("should return overall false when IPFS is down", async () => {
      // Fix: Mock the actual ipfsClusterService instead of mockIpfsClusterService
      jest.spyOn(ipfsClusterService, 'info')
        .mockRejectedValueOnce(new Error("IPFS unavailable"));

      const result = await fabricService.healthCheck();

      expect(result.overall).toBe(false);
      expect(result.ipfs).toBe(false);
    });

    it("should return overall false when local storage is down", async () => {
      jest.spyOn(fileStorageService, 'getStorageStats')
        .mockRejectedValueOnce(new Error("Storage unavailable"));

      const result = await fabricService.healthCheck();

      expect(result.overall).toBe(false);
      expect(result.localStorage).toBe(false);
    });

    it("should handle complete health check failure", async () => {
      jest.spyOn(fabloService, 'healthCheck')
        .mockRejectedValueOnce(new Error("Complete system failure"));

      const result = await fabricService.healthCheck();

      expect(result.overall).toBe(false);
      expect(result.fabric.akademik).toBe(false);
      expect(result.fabric.rektor).toBe(false);
    });

    it("should return true when all services are healthy", async () => {
      // Mock all services as healthy
      jest.spyOn(fabloService, 'healthCheck')
        .mockResolvedValueOnce({ akademik: true, rektor: true });
      jest.spyOn(ipfsClusterService, 'info')
        .mockResolvedValueOnce(undefined);
      jest.spyOn(fileStorageService, 'getStorageStats')
        .mockResolvedValueOnce({
          photos: { count: 10, totalSize: 1000 },
          signatures: { count: 5, totalSize: 500 }
        });

      const result = await fabricService.healthCheck();

      expect(result.overall).toBe(true);
      expect(result.fabric.akademik).toBe(true);
      expect(result.fabric.rektor).toBe(true);
      expect(result.ipfs).toBe(true);
      expect(result.localStorage).toBe(true);
    });
  });

  describe("Date Formatting Edge Cases", () => {
    it("should handle invalid date formats in PDF generation", async () => {
      const ijazahDataWithInvalidDate = {
        ...TestDataGenerator.generateIjazahData(),
        tanggalLahir: "invalid-date"
      };

      // Mock active signature
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      // Mock PDF generation to handle invalid date gracefully
      jest.spyOn(FabricService.prototype as any, 'generateCertificatePDF')
        .mockResolvedValueOnce(Buffer.from("mock-pdf-content"));

      // Mock IPFS operations
      jest.spyOn(ipfsClusterService, 'add')
        .mockResolvedValueOnce({ cid: 'test-cid', url: 'http://test-url' });
      jest.spyOn(ipfsClusterService, 'pin')
        .mockResolvedValueOnce(true);

      // Mock blockchain operation
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({
          ID: 'test-ijazah-id',
          ...ijazahDataWithInvalidDate,
          ipfsCID: 'test-cid'
        }));

      // Should not throw, but log warning and continue
      const result = await fabricService.createIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        ijazahDataWithInvalidDate,
        photoFile
      );

      expect(result).toBeDefined();
    });
  });

  describe("Get All Functions", () => {
    it("should get all ijazah certificates", async () => {
      const mockIjazahArray = [existingIjazah, { ...existingIjazah, ID: 'another-ijazah' }];

      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(mockIjazahArray));

      const result = await fabricService.getAllIjazah(
        Organization.AKADEMIK,
        mockUserToken
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should get all signatures", async () => {
      const mockSignatureArray = [existingSignature, { ...existingSignature, ID: 'another-signature' }];

      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(mockSignatureArray));

      const result = await fabricService.getAllSignatures(
        Organization.AKADEMIK,
        mockUserToken
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
    });

    it("should get active signature", async () => {
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      const result = await fabricService.getActiveSignature(
        Organization.AKADEMIK,
        mockUserToken
      );

      expect(result).toBeDefined();
      expect(result.IsActive).toBe(true);
    });
  });

  describe("Cleanup Operations", () => {
    it("should handle IPFS unpin errors during ijazah deletion", async () => {
      const testIjazahId = "test-ijazah-for-cleanup";
      const testIjazah = {
        ...existingIjazah,
        ID: testIjazahId,
        ipfsCID: "test-cid-for-cleanup"
      };

      // Mock getting ijazah data
      jest.spyOn(fabricService, 'getIjazah')
        .mockResolvedValueOnce(testIjazah);

      // Mock IPFS unpin to throw error
      jest.spyOn(ipfsClusterService, 'unpin')
        .mockRejectedValueOnce(new Error("Unpin failed"));

      // Mock file deletion success
      jest.spyOn(fileStorageService, 'deletePhoto')
        .mockResolvedValueOnce(true);

      // Mock blockchain deletion success
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted successfully" }));

      // Should still succeed despite unpin failure
      const result = await fabricService.deleteIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        testIjazahId
      );

      expect(result.success).toBe(true);
    });

    it("should handle missing ijazah during deletion cleanup", async () => {
      const testIjazahId = "non-existent-ijazah";

      // Mock getIjazah to throw error (ijazah not found)
      jest.spyOn(fabricService, 'getIjazah')
        .mockRejectedValueOnce(new Error("Ijazah not found"));

      // Mock blockchain deletion success (should still attempt deletion)
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted successfully" }));

      // Should still attempt deletion despite cleanup failure
      const result = await fabricService.deleteIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        testIjazahId
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe("Update Ijazah Edge Cases", () => {
    it("should throw error when ijazah not found for update", async () => {
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(null); // Ijazah not found

      const updateData: Partial<Ijazah> = {
        nama: "Updated Name"
      };

      await expect(
        fabricService.updateIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          "non-existent-id",
          updateData,
          photoFile
        )
      ).rejects.toThrow("Ijazah with ID non-existent-id not found");
    });

    it("should handle IPFS unpin errors during update", async () => {
      const testIjazahId = "test-ijazah-for-update";
      const testIjazah = {
        ...existingIjazah,
        ID: testIjazahId,
        ipfsCID: "old-cid"
      };

      const updateData: Partial<Ijazah> = {
        nama: "Updated Name"
      };

      // Mock getting existing ijazah
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(testIjazah)) // Get existing ijazah
        .mockResolvedValueOnce(JSON.stringify(existingSignature)); // Get active signature

      // Mock PDF generation to avoid file I/O issues
      jest.spyOn(FabricService.prototype as any, 'generateCertificatePDF')
        .mockResolvedValueOnce(Buffer.from("mock-pdf-content"));

      // Mock IPFS unpin to throw error
      jest.spyOn(ipfsClusterService, 'unpin')
        .mockRejectedValueOnce(new Error("Unpin failed"));

      // Mock IPFS add success
      jest.spyOn(ipfsClusterService, 'add')
        .mockResolvedValueOnce({ cid: 'new-cid', url: 'http://new-url' });
      jest.spyOn(ipfsClusterService, 'pin')
        .mockResolvedValueOnce(true);

      // Mock blockchain update success
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ ...testIjazah, ...updateData, ipfsCID: 'new-cid' }));

      // Should still succeed despite unpin failure
      const result = await fabricService.updateIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        testIjazahId,
        updateData,
        photoFile
      );

      expect(result).toBeDefined();
      expect(result.nama).toBe(updateData.nama);
    });
  });

  describe("Signature Management Edge Cases", () => {
    it("should handle signature not found during update", async () => {
      jest.spyOn(fabricService, 'getSignature')
        .mockResolvedValueOnce(null);

      const updateData: Partial<SignatureInput> = {
        IsActive: false
      };

      await expect(
        fabricService.updateSignature(
          Organization.AKADEMIK,
          mockUserToken,
          "non-existent-signature",
          updateData
        )
      ).rejects.toThrow("Signature not found");
    });

    it("should handle file deletion errors during signature deletion cleanup", async () => {
      const testSignatureId = "test-signature-for-deletion";
      const testSignature = {
        ...existingSignature,
        ID: testSignatureId,
        filePath: "test-signature-path.png"
      };

      // Mock getting signature data
      jest.spyOn(fabricService, 'getSignature')
        .mockResolvedValueOnce(testSignature);

      // Mock file deletion to throw error
      jest.spyOn(fileStorageService, 'deleteSignature')
        .mockRejectedValueOnce(new Error("File deletion failed"));

      // Mock blockchain deletion success
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted successfully" }));

      // Should still succeed despite cleanup failure
      const result = await fabricService.deleteSignature(
        Organization.AKADEMIK,
        mockUserToken,
        testSignatureId
      );

      expect(result.success).toBe(true);
    });
  });
});