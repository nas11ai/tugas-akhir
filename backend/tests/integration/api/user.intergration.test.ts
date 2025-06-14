// tests/integration/api/user.integration.test.ts
import request from "supertest";
import express from "express";
import { Organization, Role } from "../../../src/models/user";
import {
    TestDataGenerator,
    TestAuthHelper,
    TestContainerManager,
} from "../../helpers";

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

// Mock the services before importing the app - CREATE PROPER JEST MOCKS
jest.mock("../../../src/services/fabloService", () => ({
    fabloService: {
        enrollUser: jest.fn(),
        reenrollUser: jest.fn(),
        invokeChaincode: jest.fn(),
        queryChaincode: jest.fn(),
        validateToken: jest.fn(),
        healthCheck: jest.fn(),
        clearMockData: jest.fn(),
    },
}));

jest.mock("../../../src/services/userService", () => ({
    userService: {
        createUser: jest.fn(),
        getUserById: jest.fn(),
        getUserWithCredentials: jest.fn(),
        updateUser: jest.fn(),
        setUserCredentials: jest.fn(),
        removeUserCredentials: jest.fn(),
        activateUser: jest.fn(),
        deactivateUser: jest.fn(),
        getUsersByOrganization: jest.fn(),
        getActiveUsers: jest.fn(),
    },
}));

// Mock firestore service
jest.mock("../../../src/services/firestoreService", () => ({
    firestoreService: {
        createDocument: jest.fn(),
        getDocument: jest.fn(),
        updateDocument: jest.fn(),
        deleteDocument: jest.fn(),
        queryDocuments: jest.fn(),
        convertToTimestamp: jest.fn(),
        documentExists: jest.fn(),
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
import userRoutes from "../../../src/routes/userRoutes";
import { auth, db } from "../../../src/configs/firebase";
import { userService } from "../../../src/services/userService";
import { fabloService } from "../../../src/services/fabloService";
import { firestoreService } from "../../../src/services/firestoreService";
import {
    User,
    UserCredentials,
    UserWithCredentials,
} from "../../../src/models/user";

describe("User API Integration Tests", () => {
    let app: express.Application;
    let adminUser: any;
    let regularUser: any;
    let akademikUser: any;
    let rektorUser: any;
    let adminToken: string;
    let regularToken: string;
    let akademikToken: string;
    let rektorToken: string;

    // Mock Firebase Auth and Firestore
    const mockAuth = auth as jest.Mocked<typeof auth>;
    const mockDb = db as any;
    const mockUserService = userService as jest.Mocked<typeof userService>;
    const mockFabloService = fabloService as jest.Mocked<typeof fabloService>;
    const mockFirestoreService = firestoreService as jest.Mocked<
        typeof firestoreService
    >;

    // Test data
    const createMockUser = (overrides: Partial<User> = {}): User => ({
        uid: "test-uid-123",
        email: "test@example.com",
        displayName: "Test User",
        role: Role.ADMIN,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    });

    const createMockUserWithCredentials = (
        overrides: Partial<UserWithCredentials> = {}
    ): UserWithCredentials => ({
        ...createMockUser(),
        credentials: {
            username: "testuser",
            password: "testpass",
            accessToken: "mock-access-token",
            tokenExpiry: new Date(Date.now() + 3600000), // 1 hour from now
        },
        ...overrides,
    });

    beforeAll(async () => {
        // Check if services are available for integration tests
        const fabricAvailable =
            await TestContainerManager.checkFabricAvailability();
        if (!fabricAvailable) {
            console.log(
                "Fabric network not available, using mocks for integration tests"
            );
        }

        // Setup Express app
        app = express();
        app.use(express.json());
        app.use(express.urlencoded({ extended: true }));

        // Setup Firebase Auth mock
        mockAuth.verifyIdToken.mockImplementation((token: string) => {
            const tokenMap: { [key: string]: string } = {
                "mock-admin-token": "admin-user-id",
                "mock-regular-token": "regular-user-id",
                "mock-akademik-token": "akademik-user-id",
                "mock-rektor-token": "rektor-user-id",
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
                            "admin-user-id": {
                                exists: true,
                                data: () => ({
                                    uid: "admin-user-id",
                                    email: "admin@test.itk.ac.id",
                                    displayName: "Admin User",
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
                                    email: "user@test.itk.ac.id",
                                    displayName: "Regular User",
                                    role: Role.USER,
                                    organization: Organization.AKADEMIK,
                                    isActive: true,
                                    createdAt: { toDate: () => new Date() },
                                    updatedAt: { toDate: () => new Date() },
                                }),
                            },
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
                            "rektor-user-id": {
                                exists: true,
                                data: () => ({
                                    uid: "rektor-user-id",
                                    email: "rektor@test.itk.ac.id",
                                    displayName: "Rektor User",
                                    role: Role.ADMIN,
                                    organization: Organization.REKTOR,
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

        // Use real authentication middleware
        app.use("/api/users", userRoutes);

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
        adminUser = TestAuthHelper.createMockUser({
            uid: "admin-user-id",
            email: "admin@test.itk.ac.id",
            organization: Organization.AKADEMIK,
            role: Role.ADMIN,
        });

        regularUser = TestAuthHelper.createMockUser({
            uid: "regular-user-id",
            email: "user@test.itk.ac.id",
            organization: Organization.AKADEMIK,
            role: Role.USER,
        });

        akademikUser = TestAuthHelper.createMockUser({
            uid: "akademik-user-id",
            email: "akademik@test.itk.ac.id",
            organization: Organization.AKADEMIK,
            role: Role.ADMIN,
        });

        rektorUser = TestAuthHelper.createMockUser({
            uid: "rektor-user-id",
            email: "rektor@test.itk.ac.id",
            organization: Organization.REKTOR,
            role: Role.ADMIN,
        });

        adminToken = "mock-admin-token";
        regularToken = "mock-regular-token";
        akademikToken = "mock-akademik-token";
        rektorToken = "mock-rektor-token";

        // Clear mock function calls
        jest.clearAllMocks();

        // Setup default mock implementations
        mockFirestoreService.convertToTimestamp.mockReturnValue({
            toDate: () => new Date(),
        } as any);
    });

    describe("GET /api/users/me", () => {
        it("should get current user profile successfully", async () => {
            // Arrange
            const userWithCredentials = createMockUserWithCredentials({
                uid: "regular-user-id",
                email: "user@test.itk.ac.id",
                role: Role.USER,
            });

            mockUserService.getUserWithCredentials.mockResolvedValue(
                userWithCredentials
            );

            // Act
            const response = await request(app)
                .get("/api/users/me")
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                uid: "regular-user-id",
                email: "user@test.itk.ac.id",
                role: Role.USER,
            });

            expect(mockUserService.getUserWithCredentials).toHaveBeenCalledWith(
                "regular-user-id"
            );
        });

        it("should handle user not found", async () => {
            // Arrange
            mockUserService.getUserWithCredentials.mockResolvedValue(null);

            // Act
            const response = await request(app)
                .get("/api/users/me")
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("User not found");
        });

        it("should require authentication", async () => {
            // Act
            const response = await request(app).get("/api/users/me");

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("No auth token");
        });
    });

    describe("GET /api/users/:uid", () => {
        const targetUserId = "target-user-123";

        it("should get user by ID successfully", async () => {
            // Arrange
            const targetUser = createMockUser({
                uid: targetUserId,
                email: "target@test.itk.ac.id",
                displayName: "Target User",
            });

            mockUserService.getUserById.mockResolvedValue(targetUser);

            // Act
            const response = await request(app)
                .get(`/api/users/${targetUserId}`)
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                uid: targetUserId,
                email: "target@test.itk.ac.id",
                displayName: "Target User",
            });

            expect(mockUserService.getUserById).toHaveBeenCalledWith(targetUserId);
        });

        it("should handle user not found", async () => {
            // Arrange
            mockUserService.getUserById.mockResolvedValue(null);

            // Act
            const response = await request(app)
                .get(`/api/users/${targetUserId}`)
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("User not found");
        });
    });

    describe("DELETE /api/users/:uid/credentials", () => {
        const targetUserId = "regular-user-id";

        it("should remove own credentials successfully", async () => {
            // Arrange
            mockUserService.removeUserCredentials.mockResolvedValue();

            // Act
            const response = await request(app)
                .delete(`/api/users/${targetUserId}/credentials`)
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe(
                "User credentials removed successfully"
            );

            expect(mockUserService.removeUserCredentials).toHaveBeenCalledWith(
                targetUserId
            );
        });

        it("should allow admin to remove credentials for any user", async () => {
            // Arrange
            mockUserService.removeUserCredentials.mockResolvedValue();

            // Act
            const response = await request(app)
                .delete(`/api/users/${targetUserId}/credentials`)
                .set("Authorization", `Bearer ${adminToken}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it("should prevent non-admin from removing credentials for other users", async () => {
            // Arrange
            const otherUserId = "other-user-123";

            // Act
            const response = await request(app)
                .delete(`/api/users/${otherUserId}/credentials`)
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe(
                "You can only remove credentials for your own account"
            );
        });
    });

    describe("PUT /api/users/:uid/activate", () => {
        const targetUserId = "target-user-123";

        it("should activate user successfully (Admin)", async () => {
            // Arrange
            mockUserService.activateUser.mockResolvedValue();

            // Act
            const response = await request(app)
                .put(`/api/users/${targetUserId}/activate`)
                .set("Authorization", `Bearer ${adminToken}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe("User activated successfully");

            expect(mockUserService.activateUser).toHaveBeenCalledWith(targetUserId);
        });

        it("should reject non-admin access", async () => {
            // Act
            const response = await request(app)
                .put(`/api/users/${targetUserId}/activate`)
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain("Admin access required");
        });

        it("should handle user not found", async () => {
            // Arrange
            mockUserService.activateUser.mockRejectedValue(
                new Error("User not found")
            );

            // Act
            const response = await request(app)
                .put("/api/users/non-existent-user/activate")
                .set("Authorization", `Bearer ${adminToken}`);

            // Assert
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("User not found");
        });
    });

    describe("PUT /api/users/:uid/deactivate", () => {
        const targetUserId = "target-user-123";

        it("should deactivate user successfully (Admin)", async () => {
            // Arrange
            mockUserService.deactivateUser.mockResolvedValue();

            // Act
            const response = await request(app)
                .put(`/api/users/${targetUserId}/deactivate`)
                .set("Authorization", `Bearer ${adminToken}`);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe("User deactivated successfully");

            expect(mockUserService.deactivateUser).toHaveBeenCalledWith(targetUserId);
        });

        it("should reject non-admin access", async () => {
            // Act
            const response = await request(app)
                .put(`/api/users/${targetUserId}/deactivate`)
                .set("Authorization", `Bearer ${regularToken}`);

            // Assert
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain("Admin access required");
        });

        it("should handle user not found", async () => {
            // Arrange
            mockUserService.deactivateUser.mockRejectedValue(
                new Error("User not found")
            );

            // Act
            const response = await request(app)
                .put("/api/users/non-existent-user/deactivate")
                .set("Authorization", `Bearer ${adminToken}`);

            // Assert
            expect(response.status).toBe(404);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("User not found");
        });
    });

    describe("POST /api/users/enroll-fabric-ca", () => {
        it("should enroll Fabric CA successfully (AKADEMIK)", async () => {
            // Arrange
            const enrollData = {
                organization: Organization.AKADEMIK,
                username: "akademikuser",
                password: "akademikpass",
            };

            const mockToken = "mock-fabric-access-token";
            mockFabloService.enrollUser.mockResolvedValue(mockToken);

            // Act
            const response = await request(app)
                .post("/api/users/enroll-fabric-ca")
                .set("Authorization", `Bearer ${akademikToken}`)
                .send(enrollData);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.message).toBe("User enrolled successfully");
            expect(response.body.data.token).toBe(mockToken);

            expect(mockFabloService.enrollUser).toHaveBeenCalledWith(
                Organization.AKADEMIK,
                "akademikuser",
                "akademikpass"
            );
        });

        it("should enroll Fabric CA successfully (REKTOR)", async () => {
            // Arrange
            const enrollData = {
                organization: Organization.REKTOR,
                username: "rektoruser",
                password: "rektorpass",
            };

            const mockToken = "mock-fabric-access-token-rektor";
            mockFabloService.enrollUser.mockResolvedValue(mockToken);

            // Act
            const response = await request(app)
                .post("/api/users/enroll-fabric-ca")
                .set("Authorization", `Bearer ${rektorToken}`)
                .send(enrollData);

            // Assert
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBe(mockToken);
        });

        it("should require authentication", async () => {
            // Arrange
            const enrollData = {
                organization: Organization.AKADEMIK,
                username: "testuser",
                password: "testpass",
            };

            // Act
            const response = await request(app)
                .post("/api/users/enroll-fabric-ca")
                .send(enrollData);

            // Assert
            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.message).toBe("No auth token");
        });

        it("should validate enrollment data", async () => {
            // Act
            const response = await request(app)
                .post("/api/users/enroll-fabric-ca")
                .set("Authorization", `Bearer ${akademikToken}`)
                .send({
                    organization: "", // Invalid empty organization
                    username: "testuser",
                    password: "testpass",
                });

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });

        it("should handle enrollment failure", async () => {
            // Arrange
            const enrollData = {
                organization: Organization.AKADEMIK,
                username: "failuser",
                password: "failpass",
            };

            mockFabloService.enrollUser.mockRejectedValue(
                new Error("Enrollment failed")
            );

            // Act
            const response = await request(app)
                .post("/api/users/enroll-fabric-ca")
                .set("Authorization", `Bearer ${akademikToken}`)
                .send(enrollData);

            // Assert
            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe("Failed to enroll user");
        });

        it("should validate organization values", async () => {
            // Arrange
            const enrollData = {
                organization: "INVALID_ORG",
                username: "testuser",
                password: "testpass",
            };

            // Act
            const response = await request(app)
                .post("/api/users/enroll-fabric-ca")
                .set("Authorization", `Bearer ${akademikToken}`)
                .send(enrollData);

            // Assert
            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
        });
    });
});
