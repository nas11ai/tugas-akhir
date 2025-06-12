// tests/unit/services/fabricService.test.ts
import { FabricService } from "../../../src/services/fabricService";
import { Organization } from "../../../src/models/user";
import { TestDataGenerator } from "../../helpers";
import { mockFabloService, mockIpfsClusterService } from "../../mocks";
import { fabloService } from "@/services/fabloService";
import dotenv from "dotenv";
import { ipfsClusterService } from "@/services/ipfsClusterService";
import { v4 as uuidv4 } from "uuid";
import { Ijazah, Signature } from "@/models/ijazah";

dotenv.config();

// Mock the services
jest.mock("../../../src/services/fabloService", () => ({
  fabloService: mockFabloService,
}));

jest.mock("../../../src/services/ipfsClusterService", () => ({
  ipfsClusterService: mockIpfsClusterService,
}));

describe("FabricService", () => {
  let fabricService: FabricService;
  let mockUserToken: string;
  let existingIjazah: Ijazah;
  let existingSignature: Signature;

  beforeAll(async () => {
    mockUserToken = await fabloService.enrollUser(
      Organization.AKADEMIK,
      process.env.ADMIN_USERNAME || "admin",
      process.env.ADMIN_PASSWORD || "adminpw"
    );
    fabricService = new FabricService();

    const signatureFile = TestDataGenerator.generateMockSignatureBuffer();

    // Pin signature to IPFS
    const photoResult = await ipfsClusterService.add(signatureFile, {
      filename: `signature_${uuidv4()}.jpg`,
      local: false,
    });

    const signatureCID = photoResult.cid;

    await ipfsClusterService.pin(signatureCID);

    // Mock active signature
    existingSignature = await fabricService.createSignature(
      Organization.AKADEMIK,
      mockUserToken,
      {
        ID: "signature_test_001",
        CID: signatureCID,
        IsActive: true,
      }
    );

    const ijazahData = TestDataGenerator.generateIjazahData();
    const photoFile = TestDataGenerator.generateMockPhotoBuffer();

    // Act
    existingIjazah = await fabricService.createIjazah(
      Organization.AKADEMIK,
      mockUserToken,
      ijazahData,
      photoFile
    );
  });

  beforeEach(async () => {
    // Clear mock data before each test
    mockFabloService.clearMockData();
    mockIpfsClusterService.clearMockData();
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
  });

  describe("createIjazah", () => {
    it("should create ijazah certificate successfully", async () => {
      // Arrange
      const ijazahData = TestDataGenerator.generateIjazahData();
      const photoFile = TestDataGenerator.generateMockPhotoBuffer();

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
          ijazahData
        )
      ).rejects.toThrow("Photo is required");
    });
  });

  describe("updateIjazah", () => {
    it("should update ijazah certificate successfully", async () => {
      // Arrange
      const updateData = {
        nama: "Updated Graduate Name",
        programStudi: "Updated Program",
      };

      const photoFile = TestDataGenerator.generateMockPhotoBuffer();

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

    it("should throw error when ijazah not found", async () => {
      // Arrange
      const updateData = { nama: "Updated Name" };

      // Act & Assert
      await expect(
        fabricService.updateIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          "non-existent-id",
          updateData
        )
      ).rejects.toThrow("Ijazah with ID non-existent-id not found");
    });
  });

  describe("activateIjazah", () => {
    it("should activate approved ijazah certificate", async () => {
      // Act
      const result = await fabricService.activateIjazah(
        Organization.AKADEMIK,
        mockUserToken,
        existingIjazah.ID
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.Status).toBe("aktif");
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
      expect(result.nama).toBe("Test Graduate");
    });

    it("should throw error when ijazah not found", async () => {
      // Act & Assert
      await expect(
        fabricService.getIjazah(
          Organization.AKADEMIK,
          mockUserToken,
          "non-existent-id"
        )
      ).rejects.toThrow("Ijazah not found");
    });
  });

  describe("getAllIjazah", () => {
    it("should get all ijazah certificates", async () => {
      // Act
      const result = await fabricService.getAllIjazah(
        Organization.AKADEMIK,
        mockUserToken
      );

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("getIjazahByStatus", () => {
    it("should get ijazah certificates by status", async () => {
      // Act
      const result = await fabricService.getIjazahByStatus(
        Organization.AKADEMIK,
        mockUserToken,
        "aktif"
      );

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.every((ijazah) => ijazah.Status === "aktif")).toBe(true);
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

        // Act
        const result = await fabricService.createSignature(
          Organization.AKADEMIK,
          mockUserToken,
          signatureData
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.ID).toBe(signatureData.ID);
        expect(result.CID).toBe(signatureData.CID);
      });
    });

    describe("updateSignature", () => {
      it("should update signature successfully", async () => {
        // Arrange
        const updateData = {
          CID: "QmNewSignatureCID",
          IsActive: false,
        };

        // Act
        const result = await fabricService.updateSignature(
          Organization.REKTOR,
          mockUserToken,
          existingSignature.ID,
          updateData
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.CID).toBe("QmNewSignatureCID");
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

    describe("getActiveSignature", () => {
      it("should get active signature", async () => {
        // Act
        const result = await fabricService.getActiveSignature(
          Organization.AKADEMIK,
          mockUserToken
        );

        // Assert
        expect(result).toBeDefined();
        expect(result.IsActive).toBe(true);
        expect(result.ID).toBe(existingSignature.ID);
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
});
