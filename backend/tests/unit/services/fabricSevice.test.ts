// tests/unit/services/fabricService.test.ts
import { FabricService } from "../../../src/services/fabricService";
import { Organization } from "../../../src/models/user";
import { TestDataGenerator } from "../../helpers";
import { mockFabloService, mockIpfsClusterService } from "../../mocks";
import { fabloService } from "../../../src/services/fabloService";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";
import { Ijazah, Signature, SignatureInput } from "../../../src/models/ijazah";
import path from "path";

dotenv.config();

describe("FabricService", () => {
  let fabricService: FabricService;
  let mockUserToken: string;
  let existingIjazah: Ijazah;
  let existingSignature: Signature;
  let signatureFile: Buffer;
  let photoFile: Buffer;

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

    // Mock active signature
    existingSignature = await fabricService.createSignature(
      Organization.AKADEMIK,
      mockUserToken,
      {
        ID: `signature_test_${uuidv4()}_${Date.now()}`,
        filePath: signatureTestFilePath,
        IsActive: true,
      }
    );

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
        signatureData.filePath = signatureTestFilePath;

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
});
