import request from "supertest";
import express from "express";
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

    // Setup Firebase Auth mock
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

    // Use real authentication middleware
    app.use("/api/signature", signatureRoutes);

    // Error handling middleware
    app.use((error: any, req: any, res: any, next: any) => {
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
});
