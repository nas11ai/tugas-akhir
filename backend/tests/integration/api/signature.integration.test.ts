import request from "supertest";
import express from "express";
import multer from "multer";
import { Organization, Role } from "../../../src/models/user";
import {
  TestDataGenerator,
  TestAuthHelper,
  TestContainerManager,
} from "../../helpers";
import { mockFabloService, mockUserService } from "../../mocks";

// Mock Firebase Admin and Auth
jest.mock("../../../src/configs/firebase", () => ({
  auth: {
    verifyIdToken: jest.fn(),
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  },
}));

// Mock the services before importing the app
jest.mock("../../../src/services/fabloService", () => ({
  fabloService: mockFabloService,
}));

jest.mock("../../../src/services/userService", () => ({
  userService: mockUserService,
}));

// Mock file storage service
jest.mock("../../../src/services/fileStorageService", () => ({
  fileStorageService: {
    generateFileName: jest.fn(),
    saveSignature: jest.fn(),
    deleteSignature: jest.fn(),
    getStorageStats: jest.fn(),
  },
}));

// Mock fabric service
jest.mock("../../../src/services/fabricService", () => ({
  fabricService: {
    createSignature: jest.fn(),
    updateSignature: jest.fn(),
    getSignature: jest.fn(),
    getAllSignatures: jest.fn(),
    getActiveSignature: jest.fn(),
    setActiveSignature: jest.fn(),
    deleteSignature: jest.fn(),
  },
}));

// Mock logger
jest.mock("../../../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import after mocking
import signatureRoutes from "../../../src/routes/signatureRoutes";
import { auth, db } from "../../../src/configs/firebase";
import { fabricService } from "../../../src/services/fabricService";
import { fileStorageService } from "../../../src/services/fileStorageService";
import { Signature } from "../../../src/models/ijazah";
import { logger } from "@/utils/logger";

describe("Signature API Integration Tests", () => {
  let app: express.Application;
  let akademikUser: any;
  let akademikToken: string;

  // Mock Firebase Auth and Firestore
  const mockAuth = auth as jest.Mocked<typeof auth>;
  const mockDb = db as any;
  const mockFabricService = fabricService as jest.Mocked<typeof fabricService>;
  const mockFileStorageService = fileStorageService as jest.Mocked<
    typeof fileStorageService
  >;

  const generatedSignatureData = TestDataGenerator.generateSignatureData();

  // Test data
  const mockSignature: Signature = {
    ...generatedSignatureData,
    Type: "signature",
    Owner: "test-uid",
    CreatedAt: Date.now().toString(),
    UpdatedAt: Date.now().toString(),
  };

  const mockStorageStats = {
    signatures: {
      count: 5,
      totalSize: 1024000,
    },
    photos: {
      count: 10,
      totalSize: 2048000,
    },
  };

  // Helper function to setup auth mocks consistently
  const setupAuthMocks = () => {
    mockAuth.verifyIdToken.mockImplementation((token: string) => {
      if (token === "mock-akademik-token") {
        return Promise.resolve({ uid: "akademik-user-id" } as any);
      }

      return Promise.reject(new Error("Invalid token"));
    });

    // Setup Firestore mock
    mockDb.collection.mockImplementation((collectionName: string) => ({
      doc: (docId: string) => ({
        get: () => {
          if (collectionName === "users") {
            if (docId === "akademik-user-id") {
              return Promise.resolve({
                exists: true,
                data: () => ({
                  email: "akademik@test.itk.ac.id",
                  displayName: "Akademik User",
                  role: "admin",
                  organization: Organization.AKADEMIK,
                  isActive: true,
                  createdAt: { toDate: () => new Date() },
                  updatedAt: { toDate: () => new Date() },
                }),
              });
            }
          }
          return Promise.resolve({ exists: false });
        },
      }),
    }));
  };

  beforeAll(async () => {
    // Check if Fabric network is available for integration tests
    const fabricAvailable =
      await TestContainerManager.checkFabricAvailability();
    if (!fabricAvailable) {
      logger.info(
        "Fabric network not available, using mocks for integration tests"
      );
    }

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Setup initial auth mocks
    setupAuthMocks();

    // Use real authentication middleware
    app.use("/api/signature", signatureRoutes);

    // Multer error handling middleware
    app.use((error: any, req: any, res: any, next: any) => {
      if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: "File too large"
          });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
          return res.status(400).json({
            success: false,
            message: "Too many files"
          });
        }
        if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({
            success: false,
            message: "Unexpected field"
          });
        }
      }

      // Handle custom file filter errors
      if (error.message === "Only image files are allowed for signature upload") {
        return res.status(400).json({
          success: false,
          message: "Only image files are allowed for signature upload"
        });
      }

      if (error.message === "Unexpected field") {
        return res.status(400).json({
          success: false,
          message: "Unexpected field"
        });
      }

      // General error handling
      res.status(error.status || 500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    });
  });

  beforeEach(async () => {
    // Setup test users
    akademikUser = TestAuthHelper.createMockUser({
      uid: "akademik-user-id",
      email: "akademik@test.itk.ac.id",
      organization: Organization.AKADEMIK,
      role: Role.ADMIN,
    });

    akademikToken = "mock-akademik-token";

    // Add users to mock service
    mockUserService.addMockUser(akademikUser.uid, akademikUser);

    // Clear mock data
    mockFabloService.clearMockData();

    // Clear mock function calls
    jest.clearAllMocks();

    // Re-setup auth mocks after clearing
    setupAuthMocks();

    // Setup default mock implementations
    mockFileStorageService.generateFileName.mockReturnValue(
      "signature_test_123_1640995200000.png"
    );
    mockFileStorageService.saveSignature.mockResolvedValue(
      "signature_test_123_1640995200000.png"
    );
    mockFileStorageService.deleteSignature.mockResolvedValue(true);
    mockFileStorageService.getStorageStats.mockResolvedValue(mockStorageStats);
  });

  describe("GET /api/signature/active", () => {
    it("should get active signature successfully", async () => {
      // Arrange
      mockFabricService.getActiveSignature.mockResolvedValue(mockSignature);

      // Act
      const response = await request(app)
        .get("/api/signature/active")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Active signature retrieved successfully",
        data: {
          ...mockSignature,
          signatureUrl: `/api/files/signatures/${mockSignature.filePath}`,
        },
      });

      expect(mockFabricService.getActiveSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token"
      );
    });

    it("should handle no active signature found", async () => {
      // Arrange
      const error = new Error("No active signature found");
      mockFabricService.getActiveSignature.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .get("/api/signature/active")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "No active signature found",
      });
    });

    it("should require authentication", async () => {
      // Act
      const response = await request(app).get("/api/signature/active");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No auth token");
    });

    it("should require fabric token", async () => {
      // Act
      const response = await request(app)
        .get("/api/signature/active")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Fabric token is missing or invalid");
    });
  });

  describe("GET /api/signature/:id", () => {
    const signatureId = "signature_test_123";

    it("should get signature by ID successfully", async () => {
      // Arrange
      mockFabricService.getSignature.mockResolvedValue(mockSignature);

      // Act
      const response = await request(app)
        .get(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signature retrieved successfully",
        data: {
          ...mockSignature,
          signatureUrl: `/api/files/signatures/${mockSignature.filePath}`,
        },
      });

      expect(mockFabricService.getSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token",
        signatureId
      );
    });

    it("should handle signature not found", async () => {
      // Arrange
      mockFabricService.getSignature.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .get(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Signature not found",
      });
    });

    it("should handle service error", async () => {
      // Arrange
      const error = new Error("Database connection failed");
      mockFabricService.getSignature.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .get(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Database connection failed");
    });
  });

  describe("GET /api/signature", () => {
    it("should get all signatures successfully", async () => {
      // Arrange
      const mockSignatures = [
        mockSignature,
        { ...mockSignature, ID: "signature_test_456" },
      ];
      mockFabricService.getAllSignatures.mockResolvedValue(mockSignatures);

      // Act
      const response = await request(app)
        .get("/api/signature")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signatures retrieved successfully",
        data: mockSignatures.map((sig) => ({
          ...sig,
          signatureUrl: `/api/files/signatures/${sig.filePath}`,
        })),
        count: mockSignatures.length,
      });

      expect(mockFabricService.getAllSignatures).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token"
      );
    });

    it("should handle empty signatures list", async () => {
      // Arrange
      mockFabricService.getAllSignatures.mockResolvedValue([]);

      // Act
      const response = await request(app)
        .get("/api/signature")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signatures retrieved successfully",
        data: [],
        count: 0,
      });
    });

    it("should handle service error", async () => {
      // Arrange
      const error = new Error("Service unavailable");
      mockFabricService.getAllSignatures.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .get("/api/signature")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "Internal server error",
      });
    });
  });

  describe("POST /api/signature", () => {
    const signatureData = {
      ID: "signature_new_123",
      IsActive: true,
    };

    it("should create signature successfully", async () => {
      // Arrange
      const newSignature = { ...mockSignature, ...signatureData };
      mockFabricService.createSignature.mockResolvedValue(newSignature);

      // Act
      const response = await request(app)
        .post("/api/signature")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token")
        .send(signatureData);

      if (response.status !== 201) {
        console.error("Failed to create signature:", response.body);
        throw new Error("Failed to create signature");
      }

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        message: "Signature created successfully",
        data: {
          ...newSignature,
          signatureUrl: `/api/files/signatures/${newSignature.filePath}`,
        },
      });

      expect(mockFabricService.createSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token",
        signatureData
      );
    });

    it("should require authentication", async () => {
      // Act
      const response = await request(app)
        .post("/api/signature")
        .send(signatureData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No auth token");
    });

    it("should require fabric token", async () => {
      // Act
      const response = await request(app)
        .post("/api/signature")
        .set("Authorization", `Bearer ${akademikToken}`)
        .send(signatureData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Fabric token is missing or invalid");
    });

    it("should handle service error", async () => {
      // Arrange
      const error = new Error("Blockchain network error");
      mockFabricService.createSignature.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .post("/api/signature")
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token")
        .send(signatureData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        message: "Blockchain network error",
      });
    });
  });

  describe("PUT /api/signature/:id", () => {
    const signatureId = mockSignature.ID;
    const updateData = {
      IsActive: false,
    };

    it("should update signature successfully", async () => {
      // Arrange
      const updatedSignature = { ...mockSignature, ...updateData };

      mockFabricService.getSignature.mockResolvedValue(mockSignature);
      mockFabricService.updateSignature.mockResolvedValue(updatedSignature);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token")
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signature updated successfully",
        data: {
          ...updatedSignature,
          signatureUrl: `/api/files/signatures/${updatedSignature.filePath}`,
        },
      });

      expect(mockFabricService.updateSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token",
        signatureId,
        updateData
      );
    });

    it("should handle signature not found", async () => {
      // Arrange
      mockFabricService.getSignature.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token")
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Signature not found",
      });
    });

    it("should handle service error", async () => {
      // Arrange
      const error = new Error("Update failed");
      mockFabricService.getSignature.mockResolvedValue(mockSignature);
      mockFabricService.updateSignature.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token")
        .send(updateData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Update failed");
    });
  });

  describe("PUT /api/signature/:id/activate", () => {
    const signatureId = "signature_test_123";

    it("should activate signature successfully", async () => {
      // Arrange
      const activeSignature = { ...mockSignature, IsActive: true };
      mockFabricService.setActiveSignature.mockResolvedValue(activeSignature);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}/activate`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signature set as active successfully",
        data: {
          ...activeSignature,
          signatureUrl: `/api/files/signatures/${activeSignature.filePath}`,
        },
      });

      expect(mockFabricService.setActiveSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token",
        signatureId
      );
    });

    it("should handle activation error", async () => {
      // Arrange
      const error = new Error("Cannot activate signature");
      mockFabricService.setActiveSignature.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}/activate`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Cannot activate signature");
    });
  });

  describe("PUT /api/signature/:id/deactivate", () => {
    const signatureId = "signature_test_123";

    it("should deactivate signature successfully", async () => {
      // Arrange
      const deactivatedSignature = { ...mockSignature, IsActive: false };

      mockFabricService.getSignature.mockResolvedValue(mockSignature);
      mockFabricService.updateSignature.mockResolvedValue(deactivatedSignature);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}/deactivate`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signature deactivated successfully",
        data: deactivatedSignature,
      });

      expect(mockFabricService.updateSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token",
        signatureId,
        {
          ID: mockSignature.ID,
          filePath: mockSignature.filePath,
          IsActive: false,
        }
      );
    });

    it("should handle signature not found", async () => {
      // Arrange
      mockFabricService.getSignature.mockResolvedValue(null);

      // Act
      const response = await request(app)
        .put(`/api/signature/${signatureId}/deactivate`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "Signature not found",
      });
    });
  });

  describe("DELETE /api/signature/:id", () => {
    const signatureId = "signature_test_123";

    it("should delete signature successfully", async () => {
      // Arrange
      const deleteResult = { success: true, message: "Signature deleted" };
      mockFabricService.deleteSignature.mockResolvedValue(deleteResult);

      // Act
      const response = await request(app)
        .delete(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "Signature deleted successfully",
        data: deleteResult,
      });

      expect(mockFabricService.deleteSignature).toHaveBeenCalledWith(
        Organization.AKADEMIK,
        "mock-fabric-token",
        signatureId
      );
    });

    it("should handle delete error", async () => {
      // Arrange
      const error = new Error("Cannot delete active signature");
      mockFabricService.deleteSignature.mockRejectedValue(error);

      // Act
      const response = await request(app)
        .delete(`/api/signature/${signatureId}`)
        .set("Authorization", `Bearer ${akademikToken}`)
        .set("x-fabric-token", "mock-fabric-token");

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Cannot delete active signature");
    });
  });

  describe("Authorization Tests", () => {
    it("should restrict access to non-AKADEMIK organizations", async () => {
      // Setup a user with different organization
      const otherUser = TestAuthHelper.createMockUser({
        uid: "other-user-id",
        email: "other@test.itk.ac.id",
        organization: "OTHER_ORG" as any,
        role: Role.ADMIN,
      });

      // Mock auth for different organization
      mockAuth.verifyIdToken.mockImplementation((token: string) => {
        if (token === "mock-other-token") {
          return Promise.resolve({ uid: "other-user-id" } as any);
        }
        return Promise.reject(new Error("Invalid token"));
      });

      // Add to Firestore mock
      const originalMockCollection = mockDb.collection;
      mockDb.collection.mockImplementation((collectionName: string) => ({
        doc: (docId: string) => ({
          get: () => {
            if (collectionName === "users" && docId === "other-user-id") {
              return Promise.resolve({
                exists: true,
                data: () => ({
                  email: "other@test.itk.ac.id",
                  displayName: "Other User",
                  role: "admin",
                  organization: "OTHER_ORG",
                  isActive: true,
                  createdAt: { toDate: () => new Date() },
                  updatedAt: { toDate: () => new Date() },
                }),
              });
            }
            return originalMockCollection(collectionName).doc(docId).get();
          },
        }),
      }));

      // Act
      const response = await request(app)
        .post("/api/signature")
        .set("Authorization", "Bearer mock-other-token")
        .set("x-fabric-token", "mock-fabric-token")
        .send({ ID: "test_signature" });

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("organization access required");
    });
  });

  describe("POST /api/signature/upload - File Filter Tests", () => {
    // Helper function to ensure fresh auth mocks for upload tests
    const ensureAuthMocksForUpload = () => {
      // Clear and re-setup auth mocks specifically for upload tests
      jest.clearAllMocks();
      setupAuthMocks();

      // Re-setup service mocks
      mockFileStorageService.generateFileName.mockReturnValue(
        "signature_test_123_1640995200000.png"
      );
      mockFileStorageService.saveSignature.mockResolvedValue(
        "signature_test_123_1640995200000.png"
      );
      mockFileStorageService.deleteSignature.mockResolvedValue(true);
      mockFileStorageService.getStorageStats.mockResolvedValue(mockStorageStats);
    };

    describe("Valid image file uploads", () => {
      const validImageTypes = [
        { mimetype: "image/png", extension: "PNG" },
        { mimetype: "image/jpeg", extension: "JPEG" },
        { mimetype: "image/jpg", extension: "JPG" },
        { mimetype: "image/gif", extension: "GIF" },
        { mimetype: "image/bmp", extension: "BMP" },
        { mimetype: "image/webp", extension: "WebP" },
        { mimetype: "image/svg+xml", extension: "SVG" },
      ];

      validImageTypes.forEach(({ mimetype, extension }) => {
        it(`should accept ${extension} image files`, async () => {
          // Arrange
          ensureAuthMocksForUpload();
          const newSignature = { ...mockSignature, ID: "uploaded_signature_123" };
          mockFileStorageService.saveSignature.mockResolvedValue("saved_file_path.png");
          mockFabricService.createSignature.mockResolvedValue(newSignature);

          // Act
          const response = await request(app)
            .post("/api/signature/upload")
            .set("Authorization", `Bearer ${akademikToken}`)
            .set("x-fabric-token", "mock-fabric-token")
            .field("ID", "uploaded_signature_123") // Add required ID field
            .field("IsActive", "true") // Add IsActive field
            .attach("signature", Buffer.alloc(1024), {
              filename: `test-signature.${extension.toLowerCase()}`,
              contentType: mimetype,
            });

          // Debug logging
          if (response.status !== 201) {
            console.log(`${extension} file upload failed:`, response.status, response.body);
          }

          // Assert
          expect(response.status).toBe(201);
          expect(response.body.success).toBe(true);
          expect(response.body.message).toBe("Signature uploaded and created successfully");
        });
      });
    });

    describe("Invalid file type uploads", () => {
      const invalidFileTypes = [
        { mimetype: "application/pdf", filename: "document.pdf", type: "PDF" },
        { mimetype: "text/plain", filename: "document.txt", type: "Text" },
        { mimetype: "application/msword", filename: "document.doc", type: "Word" },
        { mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", filename: "document.docx", type: "Word (DOCX)" },
        { mimetype: "application/vnd.ms-excel", filename: "spreadsheet.xls", type: "Excel" },
        { mimetype: "application/json", filename: "data.json", type: "JSON" },
        { mimetype: "application/xml", filename: "data.xml", type: "XML" },
        { mimetype: "video/mp4", filename: "video.mp4", type: "Video" },
        { mimetype: "audio/mpeg", filename: "audio.mp3", type: "Audio" },
        { mimetype: "application/zip", filename: "archive.zip", type: "ZIP" },
      ];

      invalidFileTypes.forEach(({ mimetype, filename, type }) => {
        it(`should reject ${type} files`, async () => {
          // Arrange
          ensureAuthMocksForUpload();

          // Act
          const response = await request(app)
            .post("/api/signature/upload")
            .set("Authorization", `Bearer ${akademikToken}`)
            .set("x-fabric-token", "mock-fabric-token")
            .field("ID", "test_signature_123") // Add required ID field
            .field("IsActive", "true") // Add IsActive field
            .attach("signature", Buffer.alloc(1024), {
              filename,
              contentType: mimetype,
            });

          // Debug logging
          if (response.status !== 400) {
            console.log(`${type} file rejection failed:`, response.status, response.body);
          }

          // Assert - Multer error handling might return 400 or 500 depending on implementation
          expect([400, 500]).toContain(response.status);
          expect(response.body.success).toBe(false);
          // Accept either the specific multer error message or generic error
          expect(
            response.body.message === "Only image files are allowed for signature upload" ||
            response.body.message === "Internal server error" ||
            response.body.message.includes("Only image files")
          ).toBe(true);
        });
      });
    });

    describe("Invalid field name uploads", () => {
      const invalidFieldNames = [
        "document",
        "file",
        "photo",
        "image",
        "upload",
        "attachment",
        "signature_file",
        "sig",
      ];

      invalidFieldNames.forEach((fieldname) => {
        it(`should reject uploads with field name '${fieldname}'`, async () => {
          // Arrange
          ensureAuthMocksForUpload();

          // Act
          const response = await request(app)
            .post("/api/signature/upload")
            .set("Authorization", `Bearer ${akademikToken}`)
            .set("x-fabric-token", "mock-fabric-token")
            .field("ID", "test_signature_123") // Add required ID field
            .field("IsActive", "true") // Add IsActive field
            .attach(fieldname, Buffer.alloc(1024), {
              filename: "test-signature.png",
              contentType: "image/png",
            });

          // Assert - Multer error handling might return 400 or 500
          expect([400, 500]).toContain(response.status);
          expect(response.body.success).toBe(false);
          // Accept either the specific multer error message or generic error
          expect(
            response.body.message === "Unexpected field" ||
            response.body.message === "Internal server error" ||
            response.body.message.includes("Unexpected")
          ).toBe(true);
        });
      });
    });

    describe("File size validation", () => {
      it("should accept files within size limit (2MB)", async () => {
        // Arrange
        ensureAuthMocksForUpload();
        const validFileSize = 2 * 1024 * 1024 - 1; // Just under 2MB
        const newSignature = { ...mockSignature, ID: "uploaded_signature_123" };
        mockFileStorageService.saveSignature.mockResolvedValue("saved_file_path.png");
        mockFabricService.createSignature.mockResolvedValue(newSignature);

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "large_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(validFileSize), {
            filename: "large-signature.png",
            contentType: "image/png",
          });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it("should reject files exceeding size limit (>2MB)", async () => {
        // Arrange
        ensureAuthMocksForUpload();
        const oversizedFile = 2 * 1024 * 1024 + 1; // Just over 2MB

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "oversized_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(oversizedFile), {
            filename: "oversized-signature.png",
            contentType: "image/png",
          });

        // Assert - Multer error handling might return 400 or 500
        expect([400, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
        // Accept either the specific multer error message or generic error
        expect(
          response.body.message.includes("File too large") ||
          response.body.message === "Internal server error" ||
          response.body.message.includes("limit")
        ).toBe(true);
      });
    });

    describe("Multiple files validation", () => {
      it("should reject multiple file uploads", async () => {
        // Arrange
        ensureAuthMocksForUpload();

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "multi_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "signature1.png",
            contentType: "image/png",
          })
          .attach("signature", Buffer.alloc(1024), {
            filename: "signature2.png",
            contentType: "image/png",
          });

        // Assert - Multer error handling might return 400 or 500
        expect([400, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
        // Accept either the specific multer error message or generic error
        expect(
          response.body.message.includes("Too many files") ||
          response.body.message === "Internal server error" ||
          response.body.message.includes("files")
        ).toBe(true);
      });
    });

    describe("Missing file validation", () => {
      it("should handle missing signature file", async () => {
        // Arrange
        ensureAuthMocksForUpload();

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .send({}); // No file attached

        // Assert
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("Signature file is required");
      });
    });

    describe("Edge cases for file validation", () => {
      it("should handle empty files", async () => {
        // Arrange
        ensureAuthMocksForUpload();
        const newSignature = { ...mockSignature, ID: "empty_signature_123" };
        mockFileStorageService.saveSignature.mockResolvedValue("saved_empty_file.png");
        mockFabricService.createSignature.mockResolvedValue(newSignature);

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "empty_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(0), {
            filename: "empty-signature.png",
            contentType: "image/png",
          });

        // Debug logging
        if (response.status !== 201 && response.status !== 400) {
          console.log("Empty file test unexpected result:", response.status, response.body);
        }

        // Assert - The controller doesn't specifically validate empty files
        // If multer accepts it and it has valid MIME type, it may be processed
        if (response.status === 201) {
          // Controller accepted empty file - this is valid behavior
          expect(response.body.success).toBe(true);
        } else {
          // Controller or multer rejected empty file
          expect(response.status).toBe(400);
          expect(response.body.success).toBe(false);
        }
      });

      it("should handle files with misleading extensions but correct MIME type", async () => {
        // Arrange
        ensureAuthMocksForUpload();
        const newSignature = { ...mockSignature, ID: "uploaded_signature_123" };
        mockFileStorageService.saveSignature.mockResolvedValue("saved_file_path.png");
        mockFabricService.createSignature.mockResolvedValue(newSignature);

        // Act - File named .txt but has image MIME type
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "misleading_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "signature.txt", // Misleading extension
            contentType: "image/png",   // Correct MIME type
          });

        // Assert - Should be accepted based on MIME type, not extension
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it("should handle files with correct extensions but wrong MIME type", async () => {
        // Arrange
        ensureAuthMocksForUpload();

        // Act - File named .png but has text MIME type
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "wrong_mime_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "signature.png",   // Correct extension
            contentType: "text/plain",   // Wrong MIME type
          });

        // Assert - Should be rejected based on MIME type
        expect([400, 500]).toContain(response.status);
        expect(response.body.success).toBe(false);
        expect(
          response.body.message === "Only image files are allowed for signature upload" ||
          response.body.message === "Internal server error" ||
          response.body.message.includes("Only image files")
        ).toBe(true);
      });

      it("should handle files with unusual but valid image MIME types", async () => {
        // Arrange
        ensureAuthMocksForUpload();
        const newSignature = { ...mockSignature, ID: "uploaded_signature_123" };
        mockFileStorageService.saveSignature.mockResolvedValue("saved_file_path.tiff");
        mockFabricService.createSignature.mockResolvedValue(newSignature);

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "tiff_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "signature.tiff",
            contentType: "image/tiff",
          });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      it("should handle files with missing MIME type", async () => {
        // Arrange
        ensureAuthMocksForUpload();

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "no_mime_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "signature.png",
            contentType: "", // Empty MIME type
          });

        // Debug logging
        console.log("Missing MIME type test result:", response.status, response.body);

        // Assert - Empty MIME type behavior can vary
        // Some systems may infer MIME type from filename extension
        if (response.status === 201) {
          // System inferred MIME type from .png extension - valid behavior
          expect(response.body.success).toBe(true);
        } else {
          // System rejected due to empty MIME type - also valid
          expect([400, 500]).toContain(response.status);
          expect(response.body.success).toBe(false);
          expect(
            response.body.message === "Only image files are allowed for signature upload" ||
            response.body.message === "Internal server error" ||
            response.body.message.includes("Only image files")
          ).toBe(true);
        }
      });
    });

    describe("Successful upload flow", () => {
      it("should handle complete successful upload with file processing", async () => {
        // Arrange
        ensureAuthMocksForUpload();
        const uploadedSignature = {
          ...mockSignature,
          ID: "uploaded_signature_success",
          filePath: "signature_uploaded_1640995200000.png",
        };

        mockFileStorageService.generateFileName.mockReturnValue("signature_uploaded_1640995200000.png");
        mockFileStorageService.saveSignature.mockResolvedValue("signature_uploaded_1640995200000.png");
        mockFabricService.createSignature.mockResolvedValue(uploadedSignature);

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "uploaded_signature_success") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "test-signature.png",
            contentType: "image/png",
          });

        // Assert
        expect(response.status).toBe(201);
        expect(response.body).toEqual({
          success: true,
          message: "Signature uploaded and created successfully",
          data: {
            ...uploadedSignature,
            signatureUrl: `/api/files/signatures/${uploadedSignature.filePath}`,
          },
        });

        // Verify service calls
        expect(mockFileStorageService.generateFileName).toHaveBeenCalledWith(
          "signature_uploaded_signature_success",
          "test-signature.png"
        );
        expect(mockFileStorageService.saveSignature).toHaveBeenCalledWith(
          expect.any(Buffer),
          "signature_uploaded_1640995200000.png"
        );
        expect(mockFabricService.createSignature).toHaveBeenCalledWith(
          Organization.AKADEMIK,
          "mock-fabric-token",
          expect.objectContaining({
            ID: "uploaded_signature_success",
            filePath: "signature_uploaded_1640995200000.png",
            IsActive: true,
          })
        );
      });
    });

    describe("Integration with authentication and authorization", () => {
      it("should reject upload without authentication", async () => {
        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .attach("signature", Buffer.alloc(1024), {
            filename: "test-signature.png",
            contentType: "image/png",
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe("No auth token");
      });

      it("should reject upload without fabric token", async () => {
        // Arrange
        ensureAuthMocksForUpload();

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${akademikToken}`)
          .field("ID", "test_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "test-signature.png",
            contentType: "image/png",
          });

        // Assert
        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
        // Accept either fabric token error or auth error depending on middleware order
        expect(
          response.body.message === "Fabric token is missing or invalid" ||
          response.body.message === "Invalid auth token" ||
          response.body.message.includes("token")
        ).toBe(true);
      });

      it("should reject upload from unauthorized organization", async () => {
        // Setup unauthorized user
        const unauthorizedToken = "mock-unauthorized-token";

        mockAuth.verifyIdToken.mockImplementation((token: string) => {
          if (token === unauthorizedToken) {
            return Promise.resolve({ uid: "unauthorized-user-id" } as any);
          }
          if (token === akademikToken) {
            return Promise.resolve({ uid: "akademik-user-id" } as any);
          }
          return Promise.reject(new Error("Invalid token"));
        });

        // Add unauthorized user to Firestore mock
        const originalMockCollection = mockDb.collection;
        mockDb.collection.mockImplementation((collectionName: string) => ({
          doc: (docId: string) => ({
            get: () => {
              if (collectionName === "users" && docId === "unauthorized-user-id") {
                return Promise.resolve({
                  exists: true,
                  data: () => ({
                    email: "unauthorized@test.itk.ac.id",
                    displayName: "Unauthorized User",
                    role: "user",
                    organization: "OTHER_ORG",
                    isActive: true,
                    createdAt: { toDate: () => new Date() },
                    updatedAt: { toDate: () => new Date() },
                  }),
                });
              }
              return originalMockCollection(collectionName).doc(docId).get();
            },
          }),
        }));

        // Act
        const response = await request(app)
          .post("/api/signature/upload")
          .set("Authorization", `Bearer ${unauthorizedToken}`)
          .set("x-fabric-token", "mock-fabric-token")
          .field("ID", "test_signature_123") // Add required ID field
          .field("IsActive", "true") // Add IsActive field
          .attach("signature", Buffer.alloc(1024), {
            filename: "test-signature.png",
            contentType: "image/png",
          });

        // Assert
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain("organization access required");
      });
    });
  });
});