import { logger } from "../utils/logger";
import { fabloService } from "./fabloService";
import { userService } from "./userService";

/**
 * Service for managing Fabric users through Fablo REST API
 */
export class FabricUserService {
  /**
   * Register new user in Fabric CA and store credentials
   */
  async registerFabricUser(
    uid: string,
    username: string,
    password: string
  ): Promise<void> {
    try {
      const user = await userService.getUserById(uid);

      if (!user) {
        throw new Error("User not found");
      }

      // Register user in Fabric CA through Fablo
      await fabloService.registerUser(user.organization, username, password);

      // Store credentials in Firestore
      await userService.setUserCredentials(uid, {
        username,
        password,
      });

      logger.info(
        `Fabric user ${username} registered for user ${uid} in ${user.organization}`
      );
    } catch (error) {
      logger.error(`Error registering Fabric user for ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Enroll user and get access token
   */
  async enrollUser(uid: string): Promise<string> {
    try {
      const credentials = await userService.getFabloCredentials(uid);

      if (!credentials) {
        throw new Error("User Fablo credentials not found");
      }

      // Enroll user and get access token
      const accessToken = await fabloService.enrollUser(
        credentials.organization,
        credentials.username,
        credentials.password
      );

      // Set token expiry
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      // Update access token in Firestore
      await userService.updateUserAccessToken(uid, accessToken, tokenExpiry);

      logger.info(`User ${uid} enrolled successfully`);
      return accessToken;
    } catch (error) {
      logger.error(`Error enrolling user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Re-enroll user and refresh access token
   */
  async reenrollUser(uid: string): Promise<string> {
    try {
      const user = await userService.getUserWithCredentials(uid);

      if (!user || !user.credentials || !user.credentials.accessToken) {
        throw new Error("User credentials or access token not found");
      }

      // Re-enroll user and get new access token
      const newAccessToken = await fabloService.reenrollUser(
        user.organization,
        user.credentials.accessToken
      );

      // Set new token expiry
      const tokenExpiry = new Date();
      tokenExpiry.setHours(tokenExpiry.getHours() + 24);

      // Update access token in Firestore
      await userService.updateUserAccessToken(uid, newAccessToken, tokenExpiry);

      logger.info(`User ${uid} re-enrolled successfully`);
      return newAccessToken;
    } catch (error) {
      logger.error(`Error re-enrolling user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Get valid access token for user (auto-refresh if expired)
   */
  async getValidAccessToken(uid: string): Promise<string> {
    try {
      const user = await userService.getUserWithCredentials(uid);

      if (!user || !user.credentials) {
        throw new Error("User credentials not found");
      }

      // If no access token or token is expired, enroll/re-enroll user
      if (!user.credentials.accessToken || userService.isTokenExpired(user)) {
        logger.info(`Access token expired for user ${uid}, refreshing...`);

        if (user.credentials.accessToken) {
          // Re-enroll if we have an existing token
          return await this.reenrollUser(uid);
        } else {
          // Enroll if we don't have a token yet
          return await this.enrollUser(uid);
        }
      }

      // Validate token is still working
      const isValid = await fabloService.validateToken(
        user.organization,
        user.credentials.accessToken
      );

      if (!isValid) {
        logger.info(`Access token invalid for user ${uid}, refreshing...`);
        return await this.reenrollUser(uid);
      }

      return user.credentials.accessToken;
    } catch (error) {
      logger.error(`Error getting valid access token for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Execute chaincode transaction for user
   */
  async executeTransaction(
    uid: string,
    method: string,
    args: string[],
    isQuery: boolean = false
  ): Promise<any> {
    try {
      const user = await userService.getUserWithCredentials(uid);

      if (!user) {
        throw new Error("User not found");
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken(uid);

      // Execute transaction
      const request = {
        method,
        args,
      };

      if (isQuery) {
        return await fabloService.queryChaincode(
          user.organization,
          accessToken,
          request
        );
      } else {
        return await fabloService.invokeChaincode(
          user.organization,
          accessToken,
          request
        );
      }
    } catch (error) {
      logger.error(`Error executing transaction for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Create asset for user
   */
  async createAsset(
    uid: string,
    assetId: string,
    assetData: any
  ): Promise<any> {
    return this.executeTransaction(uid, "CreateAsset", [
      assetId,
      JSON.stringify(assetData),
    ]);
  }

  /**
   * Read asset for user
   */
  async readAsset(uid: string, assetId: string): Promise<any> {
    return this.executeTransaction(uid, "ReadAsset", [assetId], true);
  }

  /**
   * Update asset for user
   */
  async updateAsset(
    uid: string,
    assetId: string,
    assetData: any
  ): Promise<any> {
    return this.executeTransaction(uid, "UpdateAsset", [
      assetId,
      JSON.stringify(assetData),
    ]);
  }

  /**
   * Delete asset for user
   */
  async deleteAsset(uid: string, assetId: string): Promise<any> {
    return this.executeTransaction(uid, "DeleteAsset", [assetId]);
  }

  /**
   * Get all assets for user
   */
  async getAllAssets(uid: string): Promise<any> {
    return this.executeTransaction(uid, "GetAllAssets", [], true);
  }

  /**
   * Get user's Fabric identities (admin only)
   */
  async getUserIdentities(uid: string): Promise<any> {
    try {
      const user = await userService.getUserWithCredentials(uid);

      if (!user) {
        throw new Error("User not found");
      }

      if (user.role !== "admin") {
        throw new Error("Only admin users can view identities");
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken(uid);

      // Get identities
      return await fabloService.getIdentities(user.organization);
    } catch (error) {
      logger.error(`Error getting identities for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Discover network for user
   */
  async discoverNetwork(uid: string, channel?: string): Promise<any> {
    try {
      const user = await userService.getUserWithCredentials(uid);

      if (!user) {
        throw new Error("User not found");
      }

      // Get valid access token
      const accessToken = await this.getValidAccessToken(uid);

      // Discover network
      return await fabloService.discoverNetwork(
        user.organization,
        accessToken,
        channel
      );
    } catch (error) {
      logger.error(`Error discovering network for user ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Health check for Fabric services
   */
  async healthCheck(): Promise<{
    akademik: boolean;
    rektor: boolean;
  }> {
    try {
      return await fabloService.healthCheck();
    } catch (error) {
      logger.error("Error checking Fabric health:", error);
      return {
        akademik: false,
        rektor: false,
      };
    }
  }
}

// Export singleton instance
export const fabricUserService = new FabricUserService();
