import { FirestoreUser, Organization, Role, User, UserCredentials, UserWithCredentials } from "../models/user";
import { logger } from "../utils/logger";
import { firestoreService } from "./firestoreService";
export {Organization, Role, User, UserCredentials, UserWithCredentials} from "../models/user";

// export enum Organization {
//   AKADEMIK = "akademik",
//   REKTOR = "rektor",
// }

// export enum Role {
//   ADMIN = "admin",
//   USER = "user",
// }

// export interface UserCredentials {
//   username: string;
//   password: string;
//   accessToken?: string; // Token dari Fablo REST API setelah enroll
//   tokenExpiry?: Date; // Waktu expired token
// }

// export interface User {
//   uid: string;
//   email: string;
//   displayName?: string;
//   photoURL?: string;
//   role: Role;
//   organization: Organization;
//   createdAt: Date;
//   updatedAt: Date;
//   isActive: boolean;
// }

// export interface UserWithCredentials extends User {
//   credentials: UserCredentials;
// }

// export interface FirestoreUser {
//   uid: string;
//   email: string;
//   displayName?: string;
//   photoURL?: string;
//   role: Role;
//   organization: Organization;
//   createdAt: FirebaseFirestore.Timestamp;
//   updatedAt: FirebaseFirestore.Timestamp;
//   isActive: boolean;
//   credentials?: UserCredentials;
// }

/**
 * Service for managing user data and credentials
 */
export class UserService {
  private readonly USERS_COLLECTION = "users";

  /**
   * Create a new user in Firestore
   */
  async createUser(
    userData: Omit<User, "createdAt" | "updatedAt">
  ): Promise<User> {
    try {
      const now = new Date();
      const user: User = {
        ...userData,
        createdAt: now,
        updatedAt: now,
      };

      const firestoreUser: FirestoreUser = {
        ...user,
        createdAt: firestoreService.convertToTimestamp(now),
        updatedAt: firestoreService.convertToTimestamp(now),
      };

      await firestoreService.createDocument(
        this.USERS_COLLECTION,
        user.uid,
        firestoreUser
      );

      logger.info(`User ${user.uid} created successfully`);
      return user;
    } catch (error) {
      logger.error("Error creating user:", error);
      throw error;
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(uid: string): Promise<User | null> {
    try {
      const doc = await firestoreService.getDocument(
        this.USERS_COLLECTION,
        uid
      );

      if (!doc) {
        return null;
      }

      const firestoreUser = doc as FirestoreUser;

      const user: User = {
        ...firestoreUser,
        createdAt: firestoreUser.createdAt.toDate(),
        updatedAt: firestoreUser.updatedAt.toDate(),
      };

      return user;
    } catch (error) {
      logger.error(`Error getting user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get user with credentials by ID
   */
  async getUserWithCredentials(
    uid: string
  ): Promise<UserWithCredentials | null> {
    try {
      const doc = await firestoreService.getDocument(
        this.USERS_COLLECTION,
        uid
      );

      if (!doc) {
        return null;
      }

      const firestoreUser = doc as FirestoreUser;

      if (!firestoreUser.credentials) {
        throw new Error("User credentials not found");
      }

      const userWithCredentials: UserWithCredentials = {
        uid: firestoreUser.uid,
        email: firestoreUser.email,
        displayName: firestoreUser.displayName,
        photoURL: firestoreUser.photoURL,
        role: firestoreUser.role,
        organization: firestoreUser.organization,
        createdAt: firestoreUser.createdAt.toDate(),
        updatedAt: firestoreUser.updatedAt.toDate(),
        isActive: firestoreUser.isActive,
        credentials: firestoreUser.credentials,
      };

      return userWithCredentials;
    } catch (error) {
      logger.error(`Error getting user with credentials ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Update user information
   */
  async updateUser(
    uid: string,
    updateData: Partial<Omit<User, "uid" | "createdAt" | "updatedAt">>
  ): Promise<User> {
    try {
      const existingUser = await this.getUserById(uid);

      if (!existingUser) {
        throw new Error("User not found");
      }

      const now = new Date();
      const updatedUser: User = {
        ...existingUser,
        ...updateData,
        updatedAt: now,
      };

      const firestoreUser: FirestoreUser = {
        ...updatedUser,
        createdAt: firestoreService.convertToTimestamp(updatedUser.createdAt),
        updatedAt: firestoreService.convertToTimestamp(now),
      };

      await firestoreService.updateDocument(
        this.USERS_COLLECTION,
        uid,
        firestoreUser
      );

      logger.info(`User ${uid} updated successfully`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Set user Fablo credentials (username, password, and access token)
   */
  async setUserCredentials(
    uid: string,
    credentials: UserCredentials
  ): Promise<void> {
    try {
      const existingUser = await this.getUserById(uid);

      if (!existingUser) {
        throw new Error("User not found");
      }

      await firestoreService.updateDocument(this.USERS_COLLECTION, uid, {
        credentials: credentials,
        updatedAt: firestoreService.convertToTimestamp(new Date()),
      });

      logger.info(`Fablo credentials set for user ${uid}`);
    } catch (error) {
      logger.error(`Error setting Fablo credentials for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Update user access token after Fablo enrollment/re-enrollment
   */
  async updateUserAccessToken(
    uid: string,
    accessToken: string,
    tokenExpiry?: Date
  ): Promise<void> {
    try {
      const existingUser = await this.getUserWithCredentials(uid);

      if (!existingUser || !existingUser.credentials) {
        throw new Error("User credentials not found");
      }

      const updatedCredentials: UserCredentials = {
        ...existingUser.credentials,
        accessToken,
        tokenExpiry,
      };

      await firestoreService.updateDocument(this.USERS_COLLECTION, uid, {
        credentials: updatedCredentials,
        updatedAt: firestoreService.convertToTimestamp(new Date()),
      });

      logger.info(`Access token updated for user ${uid}`);
    } catch (error) {
      logger.error(`Error updating access token for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Check if user access token is expired
   */
  isTokenExpired(user: UserWithCredentials): boolean {
    if (!user.credentials.accessToken || !user.credentials.tokenExpiry) {
      return true;
    }

    return new Date() > user.credentials.tokenExpiry;
  }

  /**
   * Get user credentials for Fablo access
   */
  async getFabloCredentials(uid: string): Promise<{
    username: string;
    password: string;
    accessToken?: string;
    organization: Organization;
  } | null> {
    try {
      const user = await this.getUserWithCredentials(uid);

      if (!user || !user.credentials) {
        return null;
      }

      return {
        username: user.credentials.username,
        password: user.credentials.password,
        accessToken: user.credentials.accessToken,
        organization: user.organization,
      };
    } catch (error) {
      logger.error(`Error getting Fablo credentials for user ${uid}:`, error);
      return null;
    }
  }
  async removeUserCredentials(uid: string): Promise<void> {
    try {
      await firestoreService.updateDocument(this.USERS_COLLECTION, uid, {
        credentials: null,
        updatedAt: firestoreService.convertToTimestamp(new Date()),
      });

      logger.info(`Credentials removed for user ${uid}`);
    } catch (error) {
      logger.error(`Error removing credentials for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Activate user account
   */
  async activateUser(uid: string): Promise<void> {
    try {
      await this.updateUser(uid, { isActive: true });
      logger.info(`User ${uid} activated`);
    } catch (error) {
      logger.error(`Error activating user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateUser(uid: string): Promise<void> {
    try {
      await this.updateUser(uid, { isActive: false });
      logger.info(`User ${uid} deactivated`);
    } catch (error) {
      logger.error(`Error deactivating user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get users by organization
   */
  async getUsersByOrganization(organization: Organization): Promise<User[]> {
    try {
      const docs = await firestoreService.queryDocuments(
        this.USERS_COLLECTION,
        [{ field: "organization", operator: "==", value: organization }]
      );

      const users: User[] = docs.map((doc) => {
        const firestoreUser = doc as FirestoreUser;
        return {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
          photoURL: firestoreUser.photoURL,
          role: firestoreUser.role,
          organization: firestoreUser.organization,
          createdAt: firestoreUser.createdAt.toDate(),
          updatedAt: firestoreUser.updatedAt.toDate(),
          isActive: firestoreUser.isActive,
        };
      });

      return users;
    } catch (error) {
      logger.error(
        `Error getting users by organization ${organization}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get users by role
   */
  async getUsersByRole(role: Role): Promise<User[]> {
    try {
      const docs = await firestoreService.queryDocuments(
        this.USERS_COLLECTION,
        [{ field: "role", operator: "==", value: role }]
      );

      const users: User[] = docs.map((doc) => {
        const firestoreUser = doc as FirestoreUser;
        return {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
          photoURL: firestoreUser.photoURL,
          role: firestoreUser.role,
          organization: firestoreUser.organization,
          createdAt: firestoreUser.createdAt.toDate(),
          updatedAt: firestoreUser.updatedAt.toDate(),
          isActive: firestoreUser.isActive,
        };
      });

      return users;
    } catch (error) {
      logger.error(`Error getting users by role ${role}:`, error);
      throw error;
    }
  }

  /**
   * Get active users
   */
  async getActiveUsers(): Promise<User[]> {
    try {
      const docs = await firestoreService.queryDocuments(
        this.USERS_COLLECTION,
        [{ field: "isActive", operator: "==", value: true }]
      );

      const users: User[] = docs.map((doc) => {
        const firestoreUser = doc as FirestoreUser;
        return {
          uid: firestoreUser.uid,
          email: firestoreUser.email,
          displayName: firestoreUser.displayName,
          photoURL: firestoreUser.photoURL,
          role: firestoreUser.role,
          organization: firestoreUser.organization,
          createdAt: firestoreUser.createdAt.toDate(),
          updatedAt: firestoreUser.updatedAt.toDate(),
          isActive: firestoreUser.isActive,
        };
      });

      return users;
    } catch (error) {
      logger.error("Error getting active users:", error);
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await firestoreService.deleteDocument(this.USERS_COLLECTION, uid);
      logger.info(`User ${uid} deleted successfully`);
    } catch (error) {
      logger.error(`Error deleting user ${uid}:`, error);
      throw error;
    }
  }
}

// Export service instance
export const userService = new UserService();
