// tests/unit/services/userService.test.ts
import { UserService } from "../../../src/services/userService";
import { firestoreService } from "../../../src/services/firestoreService";
import { logger } from "../../../src/utils/logger";
import {
  Organization,
  Role,
  User,
  UserCredentials,
  UserWithCredentials,
} from "../../../src/models/user";

// Mock dependencies
jest.mock("../../../src/services/firestoreService");
jest.mock("../../../src/utils/logger");

const mockFirestoreService = firestoreService as jest.Mocked<
  typeof firestoreService
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("UserService", () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe("createUser", () => {
    it("should create user successfully", async () => {
      // Arrange
      const userData = {
        uid: "test-uid-123",
        email: "test@example.com",
        displayName: "Test User",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
      };

      const mockTimestamp = { toDate: () => new Date() } as any;
      mockFirestoreService.convertToTimestamp.mockReturnValue(mockTimestamp);
      mockFirestoreService.createDocument.mockResolvedValue();

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          organization: userData.organization,
          isActive: userData.isActive,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );

      expect(mockFirestoreService.createDocument).toHaveBeenCalledWith(
        "users",
        userData.uid,
        expect.objectContaining({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          role: userData.role,
          organization: userData.organization,
          isActive: userData.isActive,
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${userData.uid} created successfully`
      );
    });

    it("should handle creation error", async () => {
      // Arrange
      const userData = {
        uid: "test-uid-123",
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
      };

      const error = new Error("Firestore error");
      mockFirestoreService.createDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.createUser(userData)).rejects.toThrow(
        "Firestore error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error creating user:",
        error
      );
    });
  });

  describe("getUserById", () => {
    it("should get user by ID successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const mockFirestoreUser = {
        uid,
        email: "test@example.com",
        displayName: "Test User",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: { toDate: () => new Date("2023-01-01") },
        updatedAt: { toDate: () => new Date("2023-01-02") },
      };

      mockFirestoreService.getDocument.mockResolvedValue(mockFirestoreUser);

      // Act
      const result = await userService.getUserById(uid);

      // Assert
      expect(result).toEqual({
        uid,
        email: "test@example.com",
        displayName: "Test User",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-02"),
      });

      expect(mockFirestoreService.getDocument).toHaveBeenCalledWith(
        "users",
        uid
      );
    });

    it("should return null when user not found", async () => {
      // Arrange
      const uid = "non-existent-uid";
      mockFirestoreService.getDocument.mockResolvedValue(null);

      // Act
      const result = await userService.getUserById(uid);

      // Assert
      expect(result).toBeNull();
    });

    it("should handle get user error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Firestore error");
      mockFirestoreService.getDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.getUserById(uid)).rejects.toThrow(
        "Firestore error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting user ${uid}:`,
        error
      );
    });
  });

  describe("getUserWithCredentials", () => {
    it("should get user with credentials successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const mockCredentials: UserCredentials = {
        username: "testuser",
        password: "testpass",
        accessToken: "token123",
        tokenExpiry: new Date("2023-12-31"),
      };

      const mockFirestoreUser = {
        uid,
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: { toDate: () => new Date("2023-01-01") },
        updatedAt: { toDate: () => new Date("2023-01-02") },
        credentials: mockCredentials,
      };

      mockFirestoreService.getDocument.mockResolvedValue(mockFirestoreUser);

      // Act
      const result = await userService.getUserWithCredentials(uid);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          uid,
          email: "test@example.com",
          role: Role.USER,
          organization: Organization.AKADEMIK,
          isActive: true,
          credentials: mockCredentials,
        })
      );
    });

    it("should throw error when user has no credentials", async () => {
      // Arrange
      const uid = "test-uid-123";
      const mockFirestoreUser = {
        uid,
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        // no credentials field
      };

      mockFirestoreService.getDocument.mockResolvedValue(mockFirestoreUser);

      // Act & Assert
      await expect(userService.getUserWithCredentials(uid)).rejects.toThrow(
        "User credentials not found"
      );
    });

    it("should return null when user not found", async () => {
      // Arrange
      const uid = "non-existent-uid";
      mockFirestoreService.getDocument.mockResolvedValue(null);

      // Act
      const result = await userService.getUserWithCredentials(uid);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("updateUser", () => {
    it("should update user successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const existingUser: User = {
        uid,
        email: "test@example.com",
        displayName: "Old Name",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      const updateData = {
        displayName: "New Name",
        isActive: false,
      };

      mockFirestoreService.getDocument.mockResolvedValue({
        ...existingUser,
        createdAt: { toDate: () => existingUser.createdAt },
        updatedAt: { toDate: () => existingUser.updatedAt },
      });

      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      const result = await userService.updateUser(uid, updateData);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          uid,
          email: "test@example.com",
          displayName: "New Name",
          isActive: false,
          updatedAt: expect.any(Date),
        })
      );

      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        "users",
        uid,
        expect.objectContaining({
          displayName: "New Name",
          isActive: false,
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${uid} updated successfully`
      );
    });

    it("should throw error when user not found", async () => {
      // Arrange
      const uid = "non-existent-uid";
      mockFirestoreService.getDocument.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUser(uid, { displayName: "New Name" })
      ).rejects.toThrow("User not found");
    });
  });

  describe("setUserCredentials", () => {
    it("should set user credentials successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const credentials: UserCredentials = {
        username: "testuser",
        password: "testpass",
      };

      const existingUser = {
        uid,
        email: "test@example.com",
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      await userService.setUserCredentials(uid, credentials);

      // Assert
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        "users",
        uid,
        expect.objectContaining({
          credentials,
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Fablo credentials set for user ${uid}`
      );
    });

    it("should throw error when user not found", async () => {
      // Arrange
      const uid = "non-existent-uid";
      const credentials: UserCredentials = {
        username: "testuser",
        password: "testpass",
      };

      mockFirestoreService.getDocument.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.setUserCredentials(uid, credentials)
      ).rejects.toThrow("User not found");
    });
  });

  describe("updateUserAccessToken", () => {
    it("should update access token successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const accessToken = "new-token-123";
      const tokenExpiry = new Date("2023-12-31");

      const existingUser = {
        uid,
        email: "test@example.com",
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        credentials: {
          username: "testuser",
          password: "testpass",
          accessToken: "old-token",
          tokenExpiry: new Date("2023-06-30"),
        },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      await userService.updateUserAccessToken(uid, accessToken, tokenExpiry);

      // Assert
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        "users",
        uid,
        expect.objectContaining({
          credentials: expect.objectContaining({
            username: "testuser",
            password: "testpass",
            accessToken,
            tokenExpiry,
          }),
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Access token updated for user ${uid}`
      );
    });

    it("should throw error when user credentials not found", async () => {
      // Arrange
      const uid = "test-uid-123";
      mockFirestoreService.getDocument.mockResolvedValue(null);

      // Act & Assert
      await expect(
        userService.updateUserAccessToken(uid, "token", new Date())
      ).rejects.toThrow("User credentials not found");
    });
  });

  describe("isTokenExpired", () => {
    it("should return true when token is expired", () => {
      // Arrange
      const user: UserWithCredentials = {
        uid: "test-uid",
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        credentials: {
          username: "testuser",
          password: "testpass",
          accessToken: "token123",
          tokenExpiry: new Date("2020-01-01"), // Expired
        },
      };

      // Act
      const result = userService.isTokenExpired(user);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false when token is not expired", () => {
      // Arrange
      const user: UserWithCredentials = {
        uid: "test-uid",
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        credentials: {
          username: "testuser",
          password: "testpass",
          accessToken: "token123",
          tokenExpiry: new Date("2030-01-01"), // Future date
        },
      };

      // Act
      const result = userService.isTokenExpired(user);

      // Assert
      expect(result).toBe(false);
    });

    it("should return true when no access token", () => {
      // Arrange
      const user: UserWithCredentials = {
        uid: "test-uid",
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        credentials: {
          username: "testuser",
          password: "testpass",
          // no accessToken
        },
      };

      // Act
      const result = userService.isTokenExpired(user);

      // Assert
      expect(result).toBe(true);
    });
  });

  describe("getFabloCredentials", () => {
    it("should get Fablo credentials successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const mockCredentials: UserCredentials = {
        username: "testuser",
        password: "testpass",
        accessToken: "token123",
      };

      const mockUser = {
        uid,
        email: "test@example.com",
        organization: Organization.AKADEMIK,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        credentials: mockCredentials,
      };

      mockFirestoreService.getDocument.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getFabloCredentials(uid);

      // Assert
      expect(result).toEqual({
        username: "testuser",
        password: "testpass",
        accessToken: "token123",
        organization: Organization.AKADEMIK,
      });
    });

    it("should return null when user not found", async () => {
      // Arrange
      const uid = "non-existent-uid";
      mockFirestoreService.getDocument.mockResolvedValue(null);

      // Act
      const result = await userService.getFabloCredentials(uid);

      // Assert
      expect(result).toBeNull();
    });

    it("should return null when user has no credentials", async () => {
      // Arrange
      const uid = "test-uid-123";
      const mockUser = {
        uid,
        email: "test@example.com",
        organization: Organization.AKADEMIK,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        // no credentials
      };

      mockFirestoreService.getDocument.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getFabloCredentials(uid);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("removeUserCredentials", () => {
    it("should remove user credentials successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      await userService.removeUserCredentials(uid);

      // Assert
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        "users",
        uid,
        expect.objectContaining({
          credentials: null,
        })
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        `Credentials removed for user ${uid}`
      );
    });
  });

  describe("activateUser", () => {
    it("should activate user successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const existingUser = {
        uid,
        email: "test@example.com",
        isActive: false,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      await userService.activateUser(uid);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(`User ${uid} activated`);
    });
  });

  describe("deactivateUser", () => {
    it("should deactivate user successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      const existingUser = {
        uid,
        email: "test@example.com",
        isActive: true,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      await userService.deactivateUser(uid);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(`User ${uid} deactivated`);
    });
  });

  describe("getUsersByOrganization", () => {
    it("should get users by organization successfully", async () => {
      // Arrange
      const organization = Organization.AKADEMIK;
      const mockUsers = [
        {
          uid: "user1",
          email: "user1@example.com",
          organization: Organization.AKADEMIK,
          role: Role.USER,
          isActive: true,
          createdAt: { toDate: () => new Date("2023-01-01") },
          updatedAt: { toDate: () => new Date("2023-01-01") },
        },
        {
          uid: "user2",
          email: "user2@example.com",
          organization: Organization.AKADEMIK,
          role: Role.ADMIN,
          isActive: true,
          createdAt: { toDate: () => new Date("2023-01-02") },
          updatedAt: { toDate: () => new Date("2023-01-02") },
        },
      ];

      mockFirestoreService.queryDocuments.mockResolvedValue(mockUsers);

      // Act
      const result = await userService.getUsersByOrganization(organization);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          uid: "user1",
          email: "user1@example.com",
          organization: Organization.AKADEMIK,
        })
      );

      expect(mockFirestoreService.queryDocuments).toHaveBeenCalledWith(
        "users",
        [{ field: "organization", operator: "==", value: organization }]
      );
    });
  });

  describe("getUsersByRole", () => {
    it("should get users by role successfully", async () => {
      // Arrange
      const role = Role.ADMIN;
      const mockUsers = [
        {
          uid: "admin1",
          email: "admin1@example.com",
          role: Role.ADMIN,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        },
      ];

      mockFirestoreService.queryDocuments.mockResolvedValue(mockUsers);

      // Act
      const result = await userService.getUsersByRole(role);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe(Role.ADMIN);

      expect(mockFirestoreService.queryDocuments).toHaveBeenCalledWith(
        "users",
        [{ field: "role", operator: "==", value: role }]
      );
    });
  });

  describe("getActiveUsers", () => {
    it("should get active users successfully", async () => {
      // Arrange
      const mockUsers = [
        {
          uid: "user1",
          email: "user1@example.com",
          isActive: true,
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        },
      ];

      mockFirestoreService.queryDocuments.mockResolvedValue(mockUsers);

      // Act
      const result = await userService.getActiveUsers();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);

      expect(mockFirestoreService.queryDocuments).toHaveBeenCalledWith(
        "users",
        [{ field: "isActive", operator: "==", value: true }]
      );
    });
  });

  describe("deleteUser", () => {
    it("should delete user successfully", async () => {
      // Arrange
      const uid = "test-uid-123";
      mockFirestoreService.deleteDocument.mockResolvedValue();

      // Act
      await userService.deleteUser(uid);

      // Assert
      expect(mockFirestoreService.deleteDocument).toHaveBeenCalledWith(
        "users",
        uid
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `User ${uid} deleted successfully`
      );
    });

    it("should handle delete error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Delete failed");
      mockFirestoreService.deleteDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.deleteUser(uid)).rejects.toThrow(
        "Delete failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error deleting user ${uid}:`,
        error
      );
    });
  });

  describe("updateUser - Error Handling", () => {
    it("should handle update document error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const existingUser: User = {
        uid,
        email: "test@example.com",
        displayName: "Test User",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      const updateData = { displayName: "New Name" };
      const error = new Error("Update failed");

      mockFirestoreService.getDocument.mockResolvedValue({
        ...existingUser,
        createdAt: { toDate: () => existingUser.createdAt },
        updatedAt: { toDate: () => existingUser.updatedAt },
      });
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.updateUser(uid, updateData)).rejects.toThrow(
        "Update failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error updating user ${uid}:`,
        error
      );
    });
  });

  describe("setUserCredentials - Error Handling", () => {
    it("should handle firestore update error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const credentials: UserCredentials = {
        username: "testuser",
        password: "testpass",
      };
      const error = new Error("Firestore update failed");

      const existingUser = {
        uid,
        email: "test@example.com",
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.updateDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(
        userService.setUserCredentials(uid, credentials)
      ).rejects.toThrow("Firestore update failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error setting Fablo credentials for user ${uid}:`,
        error
      );
    });
  });

  describe("updateUserAccessToken - Error Handling", () => {
    it("should handle firestore update error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const accessToken = "new-token-123";
      const tokenExpiry = new Date("2023-12-31");
      const error = new Error("Token update failed");

      const existingUser = {
        uid,
        email: "test@example.com",
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        credentials: {
          username: "testuser",
          password: "testpass",
          accessToken: "old-token",
          tokenExpiry: new Date("2023-06-30"),
        },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.updateDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(
        userService.updateUserAccessToken(uid, accessToken, tokenExpiry)
      ).rejects.toThrow("Token update failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error updating access token for user ${uid}:`,
        error
      );
    });
  });

  describe("getFabloCredentials - Error Handling", () => {
    it("should handle getUserWithCredentials error and return null", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Database error");

      mockFirestoreService.getDocument.mockRejectedValue(error);

      // Act
      const result = await userService.getFabloCredentials(uid);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting Fablo credentials for user ${uid}:`,
        error
      );
    });
  });

  describe("removeUserCredentials - Error Handling", () => {
    it("should handle remove credentials error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Remove failed");

      mockFirestoreService.updateDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.removeUserCredentials(uid)).rejects.toThrow(
        "Remove failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error removing credentials for user ${uid}:`,
        error
      );
    });
  });

  describe("activateUser - Error Handling", () => {
    it("should handle activation error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Activation failed");

      // Mock the updateUser method to throw an error
      jest.spyOn(userService, 'updateUser').mockRejectedValue(error);

      // Act & Assert
      await expect(userService.activateUser(uid)).rejects.toThrow(
        "Activation failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error activating user ${uid}:`,
        error
      );
    });
  });

  describe("deactivateUser - Error Handling", () => {
    it("should handle deactivation error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Deactivation failed");

      // Mock the updateUser method to throw an error
      jest.spyOn(userService, 'updateUser').mockRejectedValue(error);

      // Act & Assert
      await expect(userService.deactivateUser(uid)).rejects.toThrow(
        "Deactivation failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error deactivating user ${uid}:`,
        error
      );
    });
  });

  describe("getUsersByOrganization - Error Handling", () => {
    it("should handle query error", async () => {
      // Arrange
      const organization = Organization.AKADEMIK;
      const error = new Error("Query failed");

      mockFirestoreService.queryDocuments.mockRejectedValue(error);

      // Act & Assert
      await expect(
        userService.getUsersByOrganization(organization)
      ).rejects.toThrow("Query failed");
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting users by organization ${organization}:`,
        error
      );
    });
  });

  describe("getUsersByRole - Error Handling", () => {
    it("should handle query error", async () => {
      // Arrange
      const role = Role.ADMIN;
      const error = new Error("Query failed");

      mockFirestoreService.queryDocuments.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.getUsersByRole(role)).rejects.toThrow(
        "Query failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting users by role ${role}:`,
        error
      );
    });
  });

  describe("getActiveUsers - Error Handling", () => {
    it("should handle query error", async () => {
      // Arrange
      const error = new Error("Query failed");

      mockFirestoreService.queryDocuments.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.getActiveUsers()).rejects.toThrow(
        "Query failed"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting active users:",
        error
      );
    });
  });

  describe("Edge Cases and Additional Scenarios", () => {
    it("should handle updateUserAccessToken without token expiry", async () => {
      // Arrange
      const uid = "test-uid-123";
      const accessToken = "new-token-123";

      const existingUser = {
        uid,
        email: "test@example.com",
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        credentials: {
          username: "testuser",
          password: "testpass",
          accessToken: "old-token",
        },
      };

      mockFirestoreService.getDocument.mockResolvedValue(existingUser);
      mockFirestoreService.convertToTimestamp.mockReturnValue({
        toDate: () => new Date(),
      } as any);
      mockFirestoreService.updateDocument.mockResolvedValue();

      // Act
      await userService.updateUserAccessToken(uid, accessToken);

      // Assert
      expect(mockFirestoreService.updateDocument).toHaveBeenCalledWith(
        "users",
        uid,
        expect.objectContaining({
          credentials: expect.objectContaining({
            username: "testuser",
            password: "testpass",
            accessToken,
            tokenExpiry: undefined,
          }),
        })
      );
    });

    it("should handle isTokenExpired with no tokenExpiry", () => {
      // Arrange
      const user: UserWithCredentials = {
        uid: "test-uid",
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        credentials: {
          username: "testuser",
          password: "testpass",
          accessToken: "token123",
          // no tokenExpiry
        },
      };

      // Act
      const result = userService.isTokenExpired(user);

      // Assert
      expect(result).toBe(true);
    });

    it("should handle getUserWithCredentials error", async () => {
      // Arrange
      const uid = "test-uid-123";
      const error = new Error("Firestore error");
      mockFirestoreService.getDocument.mockRejectedValue(error);

      // Act & Assert
      await expect(userService.getUserWithCredentials(uid)).rejects.toThrow(
        "Firestore error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting user with credentials ${uid}:`,
        error
      );
    });

    it("should create user with minimal required fields", async () => {
      // Arrange
      const userData = {
        uid: "test-uid-123",
        email: "test@example.com",
        role: Role.USER,
        organization: Organization.AKADEMIK,
        isActive: true,
        // No displayName, photoURL
      };

      const mockTimestamp = { toDate: () => new Date() } as any;
      mockFirestoreService.convertToTimestamp.mockReturnValue(mockTimestamp);
      mockFirestoreService.createDocument.mockResolvedValue();

      // Act
      const result = await userService.createUser(userData);

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          uid: userData.uid,
          email: userData.email,
          role: userData.role,
          organization: userData.organization,
          isActive: userData.isActive,
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        })
      );

      // Check that optional fields are not defined or undefined
      expect(result.displayName).toBeUndefined();
      expect(result.photoURL).toBeUndefined();
    });

    it("should handle getFabloCredentials with user that has credentials but missing fields", async () => {
      // Arrange
      const uid = "test-uid-123";
      const mockUser = {
        uid,
        email: "test@example.com",
        organization: Organization.AKADEMIK,
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
        credentials: {
          username: "testuser",
          password: "testpass",
          // no accessToken
        },
      };

      mockFirestoreService.getDocument.mockResolvedValue(mockUser);

      // Act
      const result = await userService.getFabloCredentials(uid);

      // Assert
      expect(result).toEqual({
        username: "testuser",
        password: "testpass",
        accessToken: undefined,
        organization: Organization.AKADEMIK,
      });
    });
  });
});
