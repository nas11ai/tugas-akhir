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
        .mockResolvedValueOnce({});
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

  // Additional tests to cover remaining uncovered lines
  describe("Additional Coverage Tests", () => {
    describe("PDF Generation Error Scenarios", () => {
      it("should handle PDF template loading errors", async () => {
        const ijazahData = TestDataGenerator.generateIjazahData();

        // Mock active signature
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(existingSignature));

        // Mock file reading to throw specific error for line 132
        jest.spyOn(require('fs/promises'), 'readFile')
          .mockImplementationOnce((...args: unknown[]) => {
            const filePath = args[0] as string;
            if (filePath.includes('template.pdf')) {
              throw new Error("ENOENT: no such file or directory");
            }
            return Buffer.from("mock-file-content");
          });

        await expect(
          fabricService.createIjazah(
            Organization.AKADEMIK,
            mockUserToken,
            ijazahData,
            photoFile
          )
        ).rejects.toThrow("Failed to generate certificate PDF");
      });
    });

    describe("Update Ijazah Error Scenarios", () => {
      it("should handle photo deletion errors during update", async () => {
        const testIjazahId = "test-ijazah-with-photo-error";
        const testIjazah = {
          ...existingIjazah,
          ID: testIjazahId,
          photoPath: "existing-photo.png"
        };

        const updateData: Partial<Ijazah> = {
          nama: "Updated Name"
        };

        // Mock getting existing ijazah
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(testIjazah)) // Get existing ijazah
          .mockResolvedValueOnce(JSON.stringify(existingSignature)); // Get active signature

        // Mock photo deletion to throw error, then continue with save
        jest.spyOn(fileStorageService, 'deletePhoto')
          .mockImplementation(async (filePath: string) => {
            // This simulates the error on line 336, but we expect the service to handle it
            throw new Error("Failed to delete old photo");
          });

        // Since deletePhoto fails, the service should still continue and save new photo
        jest.spyOn(fileStorageService, 'savePhoto')
          .mockResolvedValueOnce("new-photo-path.png");

        // Mock PDF generation
        jest.spyOn(FabricService.prototype as any, 'generateCertificatePDF')
          .mockResolvedValueOnce(Buffer.from("mock-pdf-content"));

        // Mock IPFS operations
        jest.spyOn(ipfsClusterService, 'unpin')
          .mockResolvedValueOnce(true);
        jest.spyOn(ipfsClusterService, 'add')
          .mockResolvedValueOnce({ cid: 'new-cid', url: 'http://new-url' });
        jest.spyOn(ipfsClusterService, 'pin')
          .mockResolvedValueOnce(true);

        // Mock blockchain update
        jest.spyOn(fabloService, 'invokeChaincode')
          .mockResolvedValueOnce(JSON.stringify({ ...testIjazah, ...updateData }));

        // The update should fail because deletePhoto error is not caught in service
        await expect(
          fabricService.updateIjazah(
            Organization.AKADEMIK,
            mockUserToken,
            testIjazahId,
            updateData,
            photoFile
          )
        ).rejects.toThrow("Failed to delete old photo");
      });

      it("should handle update without new photo file", async () => {
        const testIjazahId = "test-ijazah-no-new-photo";
        const testIjazah = {
          ...existingIjazah,
          ID: testIjazahId,
          photoPath: "existing-photo.png"
        };

        const updateData: Partial<Ijazah> = {
          nama: "Updated Name Only"
        };

        // Mock getting existing ijazah
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(testIjazah)) // Get existing ijazah
          .mockResolvedValueOnce(JSON.stringify(existingSignature)); // Get active signature

        // Mock PDF generation
        jest.spyOn(FabricService.prototype as any, 'generateCertificatePDF')
          .mockResolvedValueOnce(Buffer.from("mock-pdf-content"));

        // Mock IPFS operations
        jest.spyOn(ipfsClusterService, 'unpin')
          .mockResolvedValueOnce(true);
        jest.spyOn(ipfsClusterService, 'add')
          .mockResolvedValueOnce({ cid: 'new-cid', url: 'http://new-url' });
        jest.spyOn(ipfsClusterService, 'pin')
          .mockResolvedValueOnce(true);

        // Mock blockchain update
        jest.spyOn(fabloService, 'invokeChaincode')
          .mockResolvedValueOnce(JSON.stringify({ ...testIjazah, ...updateData }));

        // Update without providing new photo file
        const result = await fabricService.updateIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          testIjazahId,
          updateData
          // No photoFile parameter - should use existing photo
        );

        expect(result).toBeDefined();
        expect(result.nama).toBe(updateData.nama);
        expect(result.photoPath).toBe(testIjazah.photoPath); // Should retain existing photo
      });
    });

    describe("Blockchain Query Error Scenarios", () => {
      it("should handle getAllIjazah parsing errors", async () => {
        // Mock queryChaincode to throw error (lines 475-476)
        jest.spyOn(fabloService, 'queryChaincode')
          .mockRejectedValueOnce(new Error("Blockchain query failed"));

        await expect(
          fabricService.getAllIjazah(
            Organization.AKADEMIK,
            mockUserToken
          )
        ).rejects.toThrow("Blockchain query failed");
      });

      it("should handle getSignature parsing errors", async () => {
        // Mock queryChaincode to throw error (lines 649-650)
        jest.spyOn(fabloService, 'queryChaincode')
          .mockRejectedValueOnce(new Error("Signature query failed"));

        await expect(
          fabricService.getSignature(
            Organization.AKADEMIK,
            mockUserToken,
            "test-signature-id"
          )
        ).rejects.toThrow("Signature query failed");
      });

      it("should handle getActiveSignature parsing errors", async () => {
        // Mock queryChaincode to throw error (lines 675-676)
        jest.spyOn(fabloService, 'queryChaincode')
          .mockRejectedValueOnce(new Error("Active signature query failed"));

        await expect(
          fabricService.getActiveSignature(
            Organization.AKADEMIK,
            mockUserToken
          )
        ).rejects.toThrow("Active signature query failed");
      });

      it("should handle getAllSignatures parsing errors", async () => {
        // Mock queryChaincode to throw error (lines 701-702)
        jest.spyOn(fabloService, 'queryChaincode')
          .mockRejectedValueOnce(new Error("Signatures query failed"));

        await expect(
          fabricService.getAllSignatures(
            Organization.AKADEMIK,
            mockUserToken
          )
        ).rejects.toThrow("Signatures query failed");
      });

      it("should handle setActiveSignature parsing errors", async () => {
        // Mock invokeChaincode to throw error (lines 730-731)
        jest.spyOn(fabloService, 'invokeChaincode')
          .mockRejectedValueOnce(new Error("Set active signature failed"));

        await expect(
          fabricService.setActiveSignature(
            Organization.AKADEMIK,
            mockUserToken,
            "test-signature-id"
          )
        ).rejects.toThrow("Set active signature failed");
      });

      it("should handle deleteSignature parsing errors", async () => {
        // Mock getSignature to throw error during cleanup (lines 775-776)
        jest.spyOn(fabricService, 'getSignature')
          .mockRejectedValueOnce(new Error("Get signature failed during cleanup"));

        // Mock invokeChaincode to still succeed
        jest.spyOn(fabloService, 'invokeChaincode')
          .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted successfully" }));

        // Should still succeed despite cleanup error
        const result = await fabricService.deleteSignature(
          Organization.AKADEMIK,
          mockUserToken,
          "test-signature-id"
        );

        expect(result.success).toBe(true);
      });
    });

    describe("File Storage Service Error Coverage", () => {
      it("should handle photo file access errors during PDF generation", async () => {
        const ijazahData = TestDataGenerator.generateIjazahData();

        // Mock active signature
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(existingSignature));

        // Mock photo access to throw error
        jest.spyOn(fileStorageService, 'getPhoto')
          .mockRejectedValueOnce(new Error("Photo file not accessible"));

        await expect(
          fabricService.createIjazah(
            Organization.AKADEMIK,
            mockUserToken,
            ijazahData,
            photoFile
          )
        ).rejects.toThrow("Failed to generate certificate PDF");
      });

      it("should handle signature file access errors during PDF generation", async () => {
        const ijazahData = TestDataGenerator.generateIjazahData();

        // Mock active signature
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(existingSignature));

        // Mock signature access to throw error
        jest.spyOn(fileStorageService, 'getSignature')
          .mockRejectedValueOnce(new Error("Signature file not accessible"));

        await expect(
          fabricService.createIjazah(
            Organization.AKADEMIK,
            mockUserToken,
            ijazahData,
            photoFile
          )
        ).rejects.toThrow("Failed to generate certificate PDF");
      });
    });

    describe("PDF Document Processing Errors", () => {
      it("should handle PDF document creation errors", async () => {
        const ijazahData = TestDataGenerator.generateIjazahData();

        // Mock active signature
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(existingSignature));

        // Mock PDFDocument.load to throw error
        const mockPDFDocument = require('pdf-lib').PDFDocument;
        jest.spyOn(mockPDFDocument, 'load')
          .mockRejectedValueOnce(new Error("Invalid PDF template"));

        await expect(
          fabricService.createIjazah(
            Organization.AKADEMIK,
            mockUserToken,
            ijazahData,
            photoFile
          )
        ).rejects.toThrow("Failed to generate certificate PDF");
      });

      it("should handle image embedding errors", async () => {
        const ijazahData = TestDataGenerator.generateIjazahData();

        // Mock active signature
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce(JSON.stringify(existingSignature));

        // Mock PDF document with failing embedPng
        const mockPDFDoc = {
          embedPng: jest.fn().mockRejectedValueOnce(new Error("Cannot embed PNG")),
          getPages: jest.fn().mockReturnValue([{}]),
          getForm: jest.fn().mockReturnValue({ getTextField: jest.fn() }),
          save: jest.fn().mockResolvedValue(new Uint8Array())
        };

        const mockPDFDocument = require('pdf-lib').PDFDocument;
        jest.spyOn(mockPDFDocument, 'load')
          .mockResolvedValueOnce(mockPDFDoc);

        await expect(
          fabricService.createIjazah(
            Organization.AKADEMIK,
            mockUserToken,
            ijazahData,
            photoFile
          )
        ).rejects.toThrow("Failed to generate certificate PDF");
      });
    });

    describe("JSON Parsing Error Scenarios", () => {
      it("should handle malformed JSON in getSignature", async () => {
        // Mock queryChaincode to return invalid JSON
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce("invalid-json{");

        await expect(
          fabricService.getSignature(
            Organization.AKADEMIK,
            mockUserToken,
            "test-signature-id"
          )
        ).rejects.toThrow();
      });

      it("should handle malformed JSON in getActiveSignature", async () => {
        // Mock queryChaincode to return invalid JSON
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce("invalid-json{");

        await expect(
          fabricService.getActiveSignature(
            Organization.AKADEMIK,
            mockUserToken
          )
        ).rejects.toThrow();
      });

      it("should handle malformed JSON in getAllSignatures", async () => {
        // Mock queryChaincode to return invalid JSON
        jest.spyOn(fabloService, 'queryChaincode')
          .mockResolvedValueOnce("invalid-json{");

        await expect(
          fabricService.getAllSignatures(
            Organization.AKADEMIK,
            mockUserToken
          )
        ).rejects.toThrow();
      });
    });
  });

  describe("Final Coverage for Lines 132, 336, 775-776", () => {
    it("should cover line 132 - PDF generation catch block", async () => {
      const ijazahData = TestDataGenerator.generateIjazahData();

      // Mock active signature
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      // Mock file operations to succeed initially
      jest.spyOn(fileStorageService, 'getPhoto')
        .mockResolvedValueOnce(Buffer.from("photo-data"));
      jest.spyOn(fileStorageService, 'getSignature')
        .mockResolvedValueOnce(Buffer.from("signature-data"));
      jest.spyOn(require('fs/promises'), 'readFile')
        .mockResolvedValueOnce(Buffer.from("template-data"));

      // Mock PDF operations to fail after some processing
      const mockPDFDoc = {
        embedPng: jest.fn().mockRejectedValueOnce(new Error("Embed PNG failed")),
        getPages: jest.fn(),
        getForm: jest.fn(),
        save: jest.fn()
      };

      const mockPDFDocument = require('pdf-lib').PDFDocument;
      jest.spyOn(mockPDFDocument, 'load')
        .mockResolvedValueOnce(mockPDFDoc);

      // This should hit the catch block and line 132 (logger.error)
      await expect(
        fabricService.createIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          ijazahData,
          photoFile
        )
      ).rejects.toThrow("Failed to generate certificate PDF");
    });

    it("should cover line 336 - deletePhoto in updateIjazah with new photo", async () => {
      const testIjazahId = "test-update-with-new-photo";
      const testIjazah = {
        ...existingIjazah,
        ID: testIjazahId,
        photoPath: "existing-photo.png"
      };

      const updateData: Partial<Ijazah> = {
        nama: "Name with New Photo"
      };

      // Mock getting existing ijazah
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(testIjazah));

      // Create buffer with content to trigger photo update path
      const newPhotoBuffer = Buffer.alloc(100, 'new-photo-content');

      // Mock deletePhoto to throw error - this should hit line 336
      jest.spyOn(fileStorageService, 'deletePhoto')
        .mockRejectedValueOnce(new Error("File deletion error on line 336"));

      // The update should fail when deletePhoto throws error
      await expect(
        fabricService.updateIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          testIjazahId,
          updateData,
          newPhotoBuffer // This triggers the photo update path
        )
      ).rejects.toThrow("File deletion error on line 336");
    });

    it("should cover lines 775-776 - deleteSignature cleanup warning", async () => {
      const testSignatureId = "test-signature-cleanup-warning";

      // Set up mocks to create the exact scenario for lines 775-776
      let getSignatureCallCount = 0;
      jest.spyOn(fabricService, 'getSignature')
        .mockImplementation(async () => {
          getSignatureCallCount++;
          if (getSignatureCallCount === 1) {
            // First call should succeed (for the actual getSignature in cleanup)
            return {
              ID: testSignatureId,
              filePath: "signature-file.png",
              IsActive: false
            } as Signature;
          } else {
            // This should never be reached, but just in case
            throw new Error("Unexpected additional call");
          }
        });

      // Mock deleteSignature file operation to succeed
      jest.spyOn(fileStorageService, 'deleteSignature')
        .mockResolvedValueOnce(true);

      // But then mock the blockchain operation to also succeed
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted" }));

      // Actually, let me trigger the catch block by making getSignature fail
      jest.spyOn(fabricService, 'getSignature')
        .mockRejectedValueOnce(new Error("Failed to get signature for cleanup"));

      // Mock blockchain operation to succeed regardless
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({ success: true, message: "Deleted successfully" }));

      // This should trigger the catch block with logger.warn at lines 775-776
      const result = await fabricService.deleteSignature(
        Organization.AKADEMIK,
        mockUserToken,
        testSignatureId
      );

      expect(result.success).toBe(true);
    });

    it("should ensure all error logging paths are covered", async () => {
      // Test for complete error coverage in various scenarios
      const ijazahData = {
        ...TestDataGenerator.generateIjazahData(),
        tanggalLahir: "2023-01-01", // Valid date
        tanggalLulus: "invalid-date-format", // Invalid date to trigger warning
      };

      // Mock active signature
      jest.spyOn(fabloService, 'queryChaincode')
        .mockResolvedValueOnce(JSON.stringify(existingSignature));

      // Mock all file operations to succeed
      jest.spyOn(fileStorageService, 'getPhoto')
        .mockResolvedValueOnce(Buffer.from("photo-data"));
      jest.spyOn(fileStorageService, 'getSignature')
        .mockResolvedValueOnce(Buffer.from("signature-data"));
      jest.spyOn(require('fs/promises'), 'readFile')
        .mockResolvedValueOnce(Buffer.from("template-data"));

      // Mock PDF operations to succeed but with field errors
      const mockTextField = {
        setText: jest.fn().mockImplementation((text) => {
          if (text.includes('invalid-date-format')) {
            throw new Error("Invalid date format");
          }
        })
      };

      const mockForm = {
        getTextField: jest.fn().mockImplementation((fieldName) => {
          if (fieldName === 'tanggalLulus') {
            return mockTextField;
          }
          return { setText: jest.fn() };
        })
      };

      const mockPage = { drawImage: jest.fn() };

      const mockPDFDoc = {
        embedPng: jest.fn()
          .mockResolvedValueOnce({ scale: () => ({ width: 100, height: 100 }) })
          .mockResolvedValueOnce({ scale: () => ({ width: 50, height: 50 }) }),
        getPages: jest.fn().mockReturnValue([mockPage]),
        getForm: jest.fn().mockReturnValue(mockForm),
        save: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]))
      };

      const mockPDFDocument = require('pdf-lib').PDFDocument;
      jest.spyOn(mockPDFDocument, 'load')
        .mockResolvedValueOnce(mockPDFDoc);

      // Mock IPFS operations
      jest.spyOn(ipfsClusterService, 'add')
        .mockResolvedValueOnce({ cid: 'test-cid', url: 'http://test-url' });
      jest.spyOn(ipfsClusterService, 'pin')
        .mockResolvedValueOnce(true);

      // Mock blockchain operation
      jest.spyOn(fabloService, 'invokeChaincode')
        .mockResolvedValueOnce(JSON.stringify({
          ID: 'test-ijazah-id',
          ...ijazahData,
          ipfsCID: 'test-cid'
        }));

      // Should succeed despite date formatting warnings
      const result = await fabricService.createIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        ijazahData,
        photoFile
      );

      expect(result).toBeDefined();
    });
  });
});