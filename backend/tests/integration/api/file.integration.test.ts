// tests/integration/api/file.integration.test.ts
import request from "supertest";
import express from "express";
import path from "path";
import fs from "fs/promises";
import { Organization, Role } from "../../../src/models/user";
import { TestAuthHelper } from "../../helpers";

// Mock Firebase Admin and Auth
jest.mock("../../../src/configs/firebase", () => ({
  auth: {
    verifyIdToken: jest.fn(),
  },
  db: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
    })),
  },
}));

// Mock file storage service
jest.mock("../../../src/services/fileStorageService", () => ({
  fileStorageService: {
    getPhoto: jest.fn(),
    getSignature: jest.fn(),
    photoExists: jest.fn(),
    signatureExists: jest.fn(),
    getPhotoPath: jest.fn(),
    getSignaturePath: jest.fn(),
    getStorageStats: jest.fn(),
    savePhoto: jest.fn(),
    saveSignature: jest.fn(),
    deletePhoto: jest.fn(),
    deleteSignature: jest.fn(),
    generateFileName: jest.fn(),
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

// Mock fs/promises
jest.mock("fs/promises", () => ({
  stat: jest.fn(),
  access: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  readdir: jest.fn(),
  unlink: jest.fn(),
}));

// Import after mocking
import fileRoutes from "../../../src/routes/fileRoutes";
import { auth, db } from "../../../src/configs/firebase";
import { fileStorageService } from "../../../src/services/fileStorageService";

describe("File API Integration Tests", () => {
  let app: express.Application;
  let akademikUser: any;
  let regularUser: any;
  let adminUser: any;
  let akademikToken: string;
  let regularToken: string;
  let adminToken: string;

  // Mock Firebase Auth and Firestore
  const mockAuth = auth as jest.Mocked<typeof auth>;
  const mockDb = db as any;
  const mockFileStorageService = fileStorageService as jest.Mocked<
    typeof fileStorageService
  >;
  const mockFs = fs as jest.Mocked<typeof fs>;

  // Test data
  const mockPhotoBuffer = Buffer.from("fake-photo-data");
  const mockSignatureBuffer = Buffer.from("fake-signature-data");

  beforeAll(async () => {
    // Setup Express app
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Setup Firebase Auth mock
    mockAuth.verifyIdToken.mockImplementation((token: string) => {
      const tokenMap: { [key: string]: string } = {
        "mock-akademik-token": "akademik-user-id",
        "mock-regular-token": "regular-user-id",
        "mock-admin-token": "admin-user-id",
      };

      const uid = tokenMap[token];
      if (uid) {
        return Promise.resolve({ uid } as any);
      }
      return Promise.reject(new Error("Invalid token"));
    });

    // Setup Firestore mock
    mockDb.collection.mockImplementation((collectionName: string) => ({
      doc: (docId: string) => ({
        get: () => {
          if (collectionName === "users") {
            const userMap: { [key: string]: any } = {
              "akademik-user-id": {
                exists: true,
                data: () => ({
                  uid: "akademik-user-id",
                  email: "akademik@test.itk.ac.id",
                  displayName: "Akademik User",
                  role: Role.ADMIN,
                  organization: Organization.AKADEMIK,
                  isActive: true,
                  createdAt: { toDate: () => new Date() },
                  updatedAt: { toDate: () => new Date() },
                }),
              },
              "regular-user-id": {
                exists: true,
                data: () => ({
                  uid: "regular-user-id",
                  email: "regular@test.itk.ac.id",
                  displayName: "Regular User",
                  role: Role.USER,
                  organization: Organization.REKTOR, // Different org to test access control
                  isActive: true,
                  createdAt: { toDate: () => new Date() },
                  updatedAt: { toDate: () => new Date() },
                }),
              },
              "admin-user-id": {
                exists: true,
                data: () => ({
                  uid: "admin-user-id",
                  email: "admin@test.itk.ac.id",
                  displayName: "Admin User",
                  role: "admin", // String role for admin
                  organization: Organization.AKADEMIK,
                  isActive: true,
                  createdAt: { toDate: () => new Date() },
                  updatedAt: { toDate: () => new Date() },
                }),
              },
            };

            return Promise.resolve(userMap[docId] || { exists: false });
          }
          return Promise.resolve({ exists: false });
        },
        set: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      }),
    }));

    // Use real routes
    app.use("/api/files", fileRoutes);

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

    regularUser = TestAuthHelper.createMockUser({
      uid: "regular-user-id",
      email: "regular@test.itk.ac.id",
      organization: Organization.REKTOR,
      role: Role.USER,
    });

    adminUser = TestAuthHelper.createMockUser({
      uid: "admin-user-id",
      email: "admin@test.itk.ac.id",
      organization: Organization.AKADEMIK,
      role: "admin" as any,
    });

    akademikToken = "mock-akademik-token";
    regularToken = "mock-regular-token";
    adminToken = "mock-admin-token";

    // Clear mock function calls
    jest.clearAllMocks();
  });

  describe("GET /api/files/photos/:filename", () => {
    it("should serve photo file successfully", async () => {
      // Arrange
      const filename = "test-photo.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["cache-control"]).toBe(
        "public, max-age=31536000"
      );
      expect(response.headers["etag"]).toBe(`"${filename}"`);
      expect(Buffer.from(response.body)).toEqual(mockPhotoBuffer);

      expect(mockFileStorageService.photoExists).toHaveBeenCalledWith(filename);
      expect(mockFileStorageService.getPhoto).toHaveBeenCalledWith(filename);
    });

    it("should return 404 for non-existent photo", async () => {
      // Arrange
      const filename = "non-existent.png";
      mockFileStorageService.photoExists.mockResolvedValue(false);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Photo not found");

      expect(mockFileStorageService.photoExists).toHaveBeenCalledWith(filename);
      expect(mockFileStorageService.getPhoto).not.toHaveBeenCalled();
    });

    it("should handle file storage errors", async () => {
      // Arrange
      const filename = "error-photo.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockRejectedValue(
        new Error("Storage error")
      );

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Failed to retrieve photo");
    });
  });

  describe("GET /api/files/signatures/:filename", () => {
    it("should serve signature file successfully", async () => {
      // Arrange
      const filename = "test-signature.png";
      mockFileStorageService.signatureExists.mockResolvedValue(true);
      mockFileStorageService.getSignature.mockResolvedValue(
        mockSignatureBuffer
      );

      // Act
      const response = await request(app).get(
        `/api/files/signatures/${filename}`
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["cache-control"]).toBe(
        "public, max-age=31536000"
      );
      expect(response.headers["etag"]).toBe(`"${filename}"`);
      expect(Buffer.from(response.body)).toEqual(mockSignatureBuffer);

      expect(mockFileStorageService.signatureExists).toHaveBeenCalledWith(
        filename
      );
      expect(mockFileStorageService.getSignature).toHaveBeenCalledWith(
        filename
      );
    });

    it("should return 404 for non-existent signature", async () => {
      // Arrange
      const filename = "non-existent.png";
      mockFileStorageService.signatureExists.mockResolvedValue(false);

      // Act
      const response = await request(app).get(
        `/api/files/signatures/${filename}`
      );

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Signature not found");

      expect(mockFileStorageService.signatureExists).toHaveBeenCalledWith(
        filename
      );
      expect(mockFileStorageService.getSignature).not.toHaveBeenCalled();
    });

    it("should handle file storage errors", async () => {
      // Arrange
      const filename = "error-signature.png";
      mockFileStorageService.signatureExists.mockResolvedValue(true);
      mockFileStorageService.getSignature.mockRejectedValue(
        new Error("Storage error")
      );

      // Act
      const response = await request(app).get(
        `/api/files/signatures/${filename}`
      );

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Failed to retrieve signature");
    });
  });

  describe("GET /api/files/info/:type/:filename", () => {
    it("should get photo file info successfully", async () => {
      // Arrange
      const filename = "test-photo.png";
      const filePath = "/uploads/photos/test-photo.png";
      const mockStats = {
        size: 1024,
        birthtime: new Date("2023-01-01"),
        mtime: new Date("2023-01-02"),
      };

      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhotoPath.mockReturnValue(filePath);
      mockFs.stat.mockResolvedValue(mockStats as any);

      // Act
      const response = await request(app)
        .get(`/api/files/info/photos/${filename}`)
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("File info retrieved successfully");
      expect(response.body.data).toMatchObject({
        filename,
        type: "photos",
        size: 1024,
        created: mockStats.birthtime.toISOString(),
        modified: mockStats.mtime.toISOString(),
        url: `/api/files/photos/${filename}`,
      });

      expect(mockFileStorageService.photoExists).toHaveBeenCalledWith(filename);
      expect(mockFileStorageService.getPhotoPath).toHaveBeenCalledWith(
        filename
      );
      expect(mockFs.stat).toHaveBeenCalledWith(filePath);
    });

    it("should get signature file info successfully", async () => {
      // Arrange
      const filename = "test-signature.png";
      const filePath = "/uploads/signatures/test-signature.png";
      const mockStats = {
        size: 2048,
        birthtime: new Date("2023-01-01"),
        mtime: new Date("2023-01-02"),
      };

      mockFileStorageService.signatureExists.mockResolvedValue(true);
      mockFileStorageService.getSignaturePath.mockReturnValue(filePath);
      mockFs.stat.mockResolvedValue(mockStats as any);

      // Act
      const response = await request(app)
        .get(`/api/files/info/signatures/${filename}`)
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        filename,
        type: "signatures",
        size: 2048,
        url: `/api/files/signatures/${filename}`,
      });
    });

    it("should require authentication", async () => {
      // Act
      const response = await request(app).get(
        "/api/files/info/photos/test.png"
      );

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No auth token");
    });

    it("should require AKADEMIK organization", async () => {
      // Act
      const response = await request(app)
        .get("/api/files/info/photos/test.png")
        .set("Authorization", `Bearer ${regularToken}`); // REKTOR user

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("organization access required");
    });

    it("should validate input parameters", async () => {
      // Test invalid type
      let response = await request(app)
        .get("/api/files/info/invalid/test.png")
        .set("Authorization", `Bearer ${akademikToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid input");

      // Test invalid filename
      response = await request(app)
        .get("/api/files/info/photos/../etc/passwd")
        .set("Authorization", `Bearer ${akademikToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid input");
    });

    it("should return 404 for non-existent file", async () => {
      // Arrange
      mockFileStorageService.photoExists.mockResolvedValue(false);

      // Act
      const response = await request(app)
        .get("/api/files/info/photos/non-existent.png")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("photo not found");
    });

    it("should handle file system errors", async () => {
      // Arrange
      const filename = "test-photo.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhotoPath.mockReturnValue("/some/path");
      mockFs.stat.mockRejectedValue(new Error("File system error"));

      // Act
      const response = await request(app)
        .get(`/api/files/info/photos/${filename}`)
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Failed to retrieve file info");
    });
  });

  describe("GET /api/files/stats", () => {
    it("should get storage statistics successfully (admin)", async () => {
      // Arrange
      const mockStats = {
        photos: { count: 10, totalSize: 1024000 },
        signatures: { count: 5, totalSize: 512000 },
      };

      mockFileStorageService.getStorageStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get("/api/files/stats")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        "Storage statistics retrieved successfully"
      );
      expect(response.body.data).toMatchObject({
        photos: mockStats.photos,
        signatures: mockStats.signatures,
        totalFiles: 15,
        totalSize: 1536000,
        formattedSizes: {
          photos: "1000 KB",
          signatures: "500 KB",
          total: "1.46 MB",
        },
      });

      expect(mockFileStorageService.getStorageStats).toHaveBeenCalled();
    });

    it("should require authentication", async () => {
      // Act
      const response = await request(app).get("/api/files/stats");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No auth token");
    });

    it("should require AKADEMIK organization", async () => {
      // Act
      const response = await request(app)
        .get("/api/files/stats")
        .set("Authorization", `Bearer ${regularToken}`); // REKTOR user

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("organization access required");
    });

    it("should handle storage errors", async () => {
      // Arrange
      mockFileStorageService.getStorageStats.mockRejectedValue(
        new Error("Storage error")
      );

      // Act
      const response = await request(app)
        .get("/api/files/stats")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        "Failed to retrieve storage statistics"
      );
    });
  });

  describe("GET /api/files/health", () => {
    it("should return healthy status", async () => {
      // Arrange
      const mockStats = {
        photos: { count: 10, totalSize: 1024000 },
        signatures: { count: 5, totalSize: 512000 },
      };

      mockFileStorageService.getStorageStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("File storage is healthy");
      expect(response.body.data).toMatchObject({
        status: "healthy",
        photosDir: "accessible",
        signaturesDir: "accessible",
      });
      expect(response.body.data.timestamp).toBeDefined();

      expect(mockFileStorageService.getStorageStats).toHaveBeenCalled();
    });

    it("should return healthy status with empty directories", async () => {
      // Arrange
      const mockStats = {
        photos: { count: 0, totalSize: 0 },
        signatures: { count: 0, totalSize: 0 },
      };

      mockFileStorageService.getStorageStats.mockResolvedValue(mockStats);

      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body.data).toMatchObject({
        status: "healthy",
        photosDir: "empty",
        signaturesDir: "empty",
      });
    });

    it("should return unhealthy status on error", async () => {
      // Arrange
      mockFileStorageService.getStorageStats.mockRejectedValue(
        new Error("Storage unavailable")
      );

      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("File storage is unhealthy");
      expect(response.body.data).toMatchObject({
        status: "unhealthy",
        error: "Storage unavailable",
      });
      expect(response.body.data.timestamp).toBeDefined();
    });

    it("should require authentication", async () => {
      // Act
      const response = await request(app).get("/api/files/health");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No auth token");
    });

    it("should require AKADEMIK organization", async () => {
      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", `Bearer ${regularToken}`); // REKTOR user

      // Assert
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("organization access required");
    });
  });

  describe("Authorization and Access Control", () => {
    it("should allow AKADEMIK users access to protected routes", async () => {
      // Arrange
      mockFileStorageService.getStorageStats.mockResolvedValue({
        photos: { count: 1, totalSize: 1024 },
        signatures: { count: 1, totalSize: 1024 },
      });

      // Act - Test health check with AKADEMIK user
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(200);
    });

    it("should block REKTOR users from protected routes", async () => {
      // Act - Test multiple protected routes with REKTOR user
      const routes = [
        "/api/files/info/photos/test.png",
        "/api/files/stats",
        "/api/files/health",
      ];

      for (const route of routes) {
        const response = await request(app)
          .get(route)
          .set("Authorization", `Bearer ${regularToken}`); // REKTOR user

        expect(response.status).toBe(403);
        expect(response.body.error).toContain("organization access required");
      }
    });

    it("should handle invalid authentication tokens", async () => {
      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", "Bearer invalid-token");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid auth token");
    });

    it("should handle malformed authorization headers", async () => {
      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", "InvalidFormat");

      // Assert
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("No auth token");
    });
  });

  describe("Error Handling", () => {
    it("should handle unexpected errors gracefully", async () => {
      // Arrange - Mock an unexpected error
      mockFileStorageService.photoExists.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      // Act
      const response = await request(app).get("/api/files/photos/test.png");

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Failed to retrieve photo");
    });

    it("should handle network timeouts", async () => {
      // Arrange - Mock a timeout error
      mockFileStorageService.getStorageStats.mockRejectedValue(
        new Error("ETIMEDOUT")
      );

      // Act
      const response = await request(app)
        .get("/api/files/health")
        .set("Authorization", `Bearer ${akademikToken}`);

      // Assert
      expect(response.status).toBe(503);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("File storage is unhealthy");
      expect(response.body.data.error).toBe("ETIMEDOUT");
    });
  });

  describe("Path Traversal Security", () => {
    it("should handle URL encoded malicious paths", async () => {
      // Arrange
      const encodedPath = encodeURIComponent("../../../etc/passwd");

      // Act
      const response = await request(app).get(
        `/api/files/photos/${encodedPath}`
      );

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid filename");
    });
  });

  describe("Content Type and Headers", () => {
    it("should set correct headers for photo files", async () => {
      // Arrange
      const filename = "test-photo.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["content-length"]).toBe(
        mockPhotoBuffer.length.toString()
      );
      expect(response.headers["cache-control"]).toBe(
        "public, max-age=31536000"
      );
      expect(response.headers["etag"]).toBe(`"${filename}"`);
    });

    it("should set correct headers for signature files", async () => {
      // Arrange
      const filename = "test-signature.png";
      mockFileStorageService.signatureExists.mockResolvedValue(true);
      mockFileStorageService.getSignature.mockResolvedValue(
        mockSignatureBuffer
      );

      // Act
      const response = await request(app).get(
        `/api/files/signatures/${filename}`
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toBe("image/png");
      expect(response.headers["content-length"]).toBe(
        mockSignatureBuffer.length.toString()
      );
      expect(response.headers["cache-control"]).toBe(
        "public, max-age=31536000"
      );
      expect(response.headers["etag"]).toBe(`"${filename}"`);
    });
  });

  describe("File Size Formatting", () => {
    it("should format bytes correctly in storage stats", async () => {
      // Arrange - Test various file sizes
      const testCases = [
        {
          photos: { count: 1, totalSize: 0 },
          signatures: { count: 0, totalSize: 0 },
          expectedPhotos: "0 Bytes",
          expectedTotal: "0 Bytes",
        },
        {
          photos: { count: 1, totalSize: 1024 },
          signatures: { count: 0, totalSize: 0 },
          expectedPhotos: "1 KB",
          expectedTotal: "1 KB",
        },
        {
          photos: { count: 1, totalSize: 1048576 },
          signatures: { count: 0, totalSize: 0 },
          expectedPhotos: "1 MB",
          expectedTotal: "1 MB",
        },
        {
          photos: { count: 1, totalSize: 1536000 },
          signatures: { count: 1, totalSize: 512000 },
          expectedPhotos: "1.46 MB",
          expectedTotal: "1.95 MB",
        },
      ];

      for (const testCase of testCases) {
        // Arrange
        mockFileStorageService.getStorageStats.mockResolvedValue({
          photos: testCase.photos,
          signatures: testCase.signatures,
        });

        // Act
        const response = await request(app)
          .get("/api/files/stats")
          .set("Authorization", `Bearer ${adminToken}`);

        // Assert
        expect(response.status).toBe(200);
        expect(response.body.data.formattedSizes.photos).toBe(
          testCase.expectedPhotos
        );
        expect(response.body.data.formattedSizes.total).toBe(
          testCase.expectedTotal
        );
      }
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle multiple concurrent photo requests", async () => {
      // Arrange
      const filename = "concurrent-test.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);

      // Act - Make 5 concurrent requests
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).get(`/api/files/photos/${filename}`));
      const responses = await Promise.all(promises);

      // Assert
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toBe("image/png");
      });

      // Verify service was called for each request
      expect(mockFileStorageService.photoExists).toHaveBeenCalledTimes(5);
      expect(mockFileStorageService.getPhoto).toHaveBeenCalledTimes(5);
    });

    it("should handle mixed concurrent requests (photos and signatures)", async () => {
      // Arrange
      const photoFilename = "test-photo.png";
      const signatureFilename = "test-signature.png";

      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.signatureExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);
      mockFileStorageService.getSignature.mockResolvedValue(
        mockSignatureBuffer
      );

      // Act - Make concurrent requests for both types
      const promises = [
        request(app).get(`/api/files/photos/${photoFilename}`),
        request(app).get(`/api/files/signatures/${signatureFilename}`),
        request(app).get(`/api/files/photos/${photoFilename}`),
        request(app).get(`/api/files/signatures/${signatureFilename}`),
      ];
      const responses = await Promise.all(promises);

      // Assert
      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toBe("image/png");
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty filename", async () => {
      // Act
      const response = await request(app).get("/api/files/photos/");

      // Assert - This should hit a 404 because the route won't match
      expect(response.status).toBe(404);
    });

    it("should handle very long filenames", async () => {
      // Arrange
      const longFilename = "a".repeat(300) + ".png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);

      // Act
      const response = await request(app).get(
        `/api/files/photos/${longFilename}`
      );

      // Assert
      expect(response.status).toBe(200);
      expect(mockFileStorageService.photoExists).toHaveBeenCalledWith(
        longFilename
      );
    });

    it("should handle special characters in filenames", async () => {
      // Arrange
      const specialFilename = "test-file@123#$%^&()_+.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);

      // Act
      const response = await request(app).get(
        `/api/files/photos/${encodeURIComponent(specialFilename)}`
      );

      // Assert
      expect(response.status).toBe(200);
    });

    it("should handle zero-byte files", async () => {
      // Arrange
      const filename = "empty-file.png";
      const emptyBuffer = Buffer.alloc(0);
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(emptyBuffer);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-length"]).toBe("0");
    });

    it("should handle large file buffers", async () => {
      // Arrange
      const filename = "large-file.png";
      const largeBuffer = Buffer.alloc(10 * 1024 * 1024); // 10MB
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(largeBuffer);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["content-length"]).toBe(
        largeBuffer.length.toString()
      );
    });
  });

  describe("Performance Considerations", () => {
    it("should set appropriate cache headers for static files", async () => {
      // Arrange
      const filename = "cacheable-photo.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockResolvedValue(mockPhotoBuffer);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toBe(
        "public, max-age=31536000"
      ); // 1 year
      expect(response.headers["etag"]).toBe(`"${filename}"`);
    });

    it("should handle file existence check efficiently", async () => {
      // Arrange
      const filename = "efficiency-test.png";
      mockFileStorageService.photoExists.mockResolvedValue(false);

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(404);

      // Verify that getPhoto was not called when file doesn't exist
      expect(mockFileStorageService.photoExists).toHaveBeenCalledWith(filename);
      expect(mockFileStorageService.getPhoto).not.toHaveBeenCalled();
    });
  });

  describe("Security Headers", () => {
    it("should not expose sensitive information in error messages", async () => {
      // Arrange
      const filename = "test-photo.png";
      mockFileStorageService.photoExists.mockResolvedValue(true);
      mockFileStorageService.getPhoto.mockRejectedValue(
        new Error(
          "ENOENT: no such file or directory, open '/secret/path/file.png'"
        )
      );

      // Act
      const response = await request(app).get(`/api/files/photos/${filename}`);

      // Assert
      expect(response.status).toBe(500);
      expect(response.body.message).toBe("Failed to retrieve photo");
      expect(response.body.message).not.toContain("/secret/path");
    });

    it("should handle malformed file paths gracefully", async () => {
      // Arrange
      const malformedPaths = [
        "test\x00file.png", // Null byte injection
        "test\rfile.png", // Carriage return
        "test\nfile.png", // Line feed
      ];

      for (const filename of malformedPaths) {
        // Act
        const response = await request(app).get(
          `/api/files/photos/${encodeURIComponent(filename)}`
        );

        // Assert - Should handle gracefully without exposing system details
        expect([400, 404, 500]).toContain(response.status);
      }
    });
  });
});
