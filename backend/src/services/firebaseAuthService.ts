import { auth } from "../configs/firebase";
import { logger } from "../utils/logger";
import * as admin from "firebase-admin";

/**
 * Firebase Authentication Service
 */
export class FirebaseAuthService {
  /**
   * Verify Firebase ID token
   */
  async verifyIdToken(
    idToken: string
  ): Promise<admin.auth.DecodedIdToken | null> {
    try {
      const decodedToken = await auth.verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      logger.error("Error verifying ID token:", error);
      return null;
    }
  }

  /**
   * Get user by UID from Firebase Auth
   */
  async getAuthUser(uid: string): Promise<admin.auth.UserRecord | null> {
    try {
      const userRecord = await auth.getUser(uid);
      return userRecord;
    } catch (error) {
      logger.error(`Error getting auth user ${uid}:`, error);
      return null;
    }
  }

  /**
   * Create custom token for a user
   */
  async createCustomToken(
    uid: string,
    additionalClaims?: object
  ): Promise<string> {
    try {
      const customToken = await auth.createCustomToken(uid, additionalClaims);
      return customToken;
    } catch (error) {
      logger.error(`Error creating custom token for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Set custom user claims
   */
  async setCustomUserClaims(uid: string, customClaims: object): Promise<void> {
    try {
      await auth.setCustomUserClaims(uid, customClaims);
      logger.info(`Custom claims set for user ${uid}`);
    } catch (error) {
      logger.error(`Error setting custom claims for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(
    maxResults?: number,
    pageToken?: string
  ): Promise<admin.auth.ListUsersResult> {
    try {
      const listUsersResult = await auth.listUsers(maxResults, pageToken);
      return listUsersResult;
    } catch (error) {
      logger.error("Error listing users:", error);
      throw error;
    }
  }

  /**
   * Create a new user in Firebase Auth
   */
  async createUser(
    userProperties: admin.auth.CreateRequest
  ): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await auth.createUser(userProperties);
      logger.info(`Auth user created: ${userRecord.uid}`);
      return userRecord;
    } catch (error) {
      logger.error("Error creating auth user:", error);
      throw error;
    }
  }

  /**
   * Update user in Firebase Auth
   */
  async updateUser(
    uid: string,
    properties: admin.auth.UpdateRequest
  ): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await auth.updateUser(uid, properties);
      logger.info(`Auth user updated: ${uid}`);
      return userRecord;
    } catch (error) {
      logger.error(`Error updating auth user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Delete user from Firebase Auth
   */
  async deleteUser(uid: string): Promise<void> {
    try {
      await auth.deleteUser(uid);
      logger.info(`Auth user deleted: ${uid}`);
    } catch (error) {
      logger.error(`Error deleting auth user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Disable user account
   */
  async disableUser(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await auth.updateUser(uid, { disabled: true });
      logger.info(`User disabled: ${uid}`);
      return userRecord;
    } catch (error) {
      logger.error(`Error disabling user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Enable user account
   */
  async enableUser(uid: string): Promise<admin.auth.UserRecord> {
    try {
      const userRecord = await auth.updateUser(uid, { disabled: false });
      logger.info(`User enabled: ${uid}`);
      return userRecord;
    } catch (error) {
      logger.error(`Error enabling user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get multiple users by UIDs
   */
  async getUsers(uids: string[]): Promise<admin.auth.GetUsersResult> {
    try {
      const getUsersResult = await auth.getUsers(uids.map((uid) => ({ uid })));
      return getUsersResult;
    } catch (error) {
      logger.error("Error getting multiple users:", error);
      throw error;
    }
  }

  /**
   * Revoke refresh tokens for a user
   */
  async revokeRefreshTokens(uid: string): Promise<void> {
    try {
      await auth.revokeRefreshTokens(uid);
      logger.info(`Refresh tokens revoked for user: ${uid}`);
    } catch (error) {
      logger.error(`Error revoking refresh tokens for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Health check for Firebase Auth
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Test Auth by trying to list users (basic operation)
      await auth.listUsers(1);
      return true;
    } catch (error) {
      logger.warn("Firebase Auth health check failed:", error);
      return false;
    }
  }

  /**
   * Get Auth instance
   */
  getAuth(): admin.auth.Auth {
    return auth;
  }
}

// Export singleton instance
export const firebaseAuthService = new FirebaseAuthService();
