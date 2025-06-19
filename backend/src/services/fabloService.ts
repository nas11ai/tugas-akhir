import { AxiosInstance } from "axios";
import { logger } from "../utils/logger";
import {
  chaincode,
  akademikClient,
  rektorClient,
  setFabricAuthHeader,
} from "../configs/fabric";
import { Organization } from "../models/user";
import dotenv from "dotenv";
import {
  FabloEnrollResponse,
  FabloInvokeRequest,
  FabloResponse,
} from "../models/fablo";

dotenv.config();

/**
 * Fablo REST API Service using fabric.ts configuration
 */
export class FabloService {
  private adminTokens: Map<Organization, string> = new Map();

  constructor() {
    // Initialize admin tokens
    this.initializeAdminTokens();
  }

  /**
   * Get the appropriate client based on organization
   */
  private getClient(organization: Organization): AxiosInstance {
    switch (organization) {
      case Organization.AKADEMIK:
        return akademikClient;
      case Organization.REKTOR:
        return rektorClient;
      default:
        return akademikClient;
    }
  }

  /**
   * Initialize admin tokens for both organizations
   */
  private async initializeAdminTokens(): Promise<void> {
    try {
      const adminUsername = process.env.ADMIN_USERNAME || "admin";
      const adminPassword = process.env.ADMIN_PASSWORD || "adminpw";

      // Enroll admin for akademik organization
      const akademikToken = await this.enrollUser(
        Organization.AKADEMIK,
        adminUsername,
        adminPassword
      );
      this.adminTokens.set(Organization.AKADEMIK, akademikToken);
      setFabricAuthHeader(akademikClient, akademikToken);

      logger.info("Admin tokens initialized for Akademik organization");
    } catch (error) {
      logger.error("Failed to initialize admin tokens:", error);
    }
  }

  /**
   * Get admin token for organization
   */
  private getAdminToken(organization: Organization): string {
    const token = this.adminTokens.get(organization);
    if (!token) {
      throw new Error(
        `Admin token not available for organization: ${organization}`
      );
    }
    return token;
  }

  /**
   * Enroll user and get access token
   */
  async enrollUser(
    organization: Organization,
    username: string,
    password: string
  ): Promise<string> {
    try {
      const client = this.getClient(organization);

      const response = await client.post("/user/enroll", {
        id: username,
        secret: password,
      });

      const data: FabloEnrollResponse = response.data;

      logger.info(
        `User ${username} enrolled successfully in ${organization} organization`
      );
      return data.token;
    } catch (error) {
      logger.error(
        `Error enrolling user ${username} in ${organization}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Re-enroll user and get new access token
   */
  async reenrollUser(
    organization: Organization,
    currentToken: string
  ): Promise<string> {
    try {
      const client = this.getClient(organization);

      const response = await client.post(
        "/user/reenroll",
        {},
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
          },
        }
      );

      const data: FabloEnrollResponse = response.data;

      logger.info(
        `User re-enrolled successfully in ${organization} organization`
      );
      return data.token;
    } catch (error) {
      logger.error(`Error re-enrolling user in ${organization}:`, error);
      throw error;
    }
  }

  /**
   * Invoke chaincode method
   */
  async invokeChaincode(
    organization: Organization,
    userToken: string,
    request: FabloInvokeRequest,
    channel: string = chaincode.channel,
    chaincodeContract: string = chaincode.name
  ): Promise<any> {
    try {
      const client = this.getClient(organization);

      const response = await client.post(
        `/invoke/${channel}/${chaincodeContract}`,
        request,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      const data: FabloResponse = response.data;

      logger.info(`Chaincode invoked successfully: ${request.method}`);
      return JSON.stringify(data.response);
    } catch (error) {
      logger.error(`Error invoking chaincode ${request.method}:`, error);
      throw error;
    }
  }

  /**
   * Query chaincode method
   */
  async queryChaincode(
    organization: Organization,
    userToken: string,
    request: FabloInvokeRequest,
    channel: string = chaincode.channel,
    chaincodeContract: string = chaincode.name
  ): Promise<any> {
    try {
      const client = this.getClient(organization);

      const response = await client.post(
        `/query/${channel}/${chaincodeContract}`,
        request,
        {
          headers: {
            Authorization: `Bearer ${userToken}`,
          },
        }
      );

      const data: FabloResponse = response.data;

      logger.info(`Chaincode queried successfully: ${request.method}`);
      return JSON.stringify(data.response);
    } catch (error) {
      logger.error(`Error querying chaincode ${request.method}:`, error);
      throw error;
    }
  }

  /**
   * Check if user token is still valid
   */
  async validateToken(
    organization: Organization,
    token: string
  ): Promise<boolean> {
    try {
      // Try a simple query to validate token
      await this.queryChaincode(organization, token, {
        method: "GetAllAssets",
        args: [],
      });
      return true;
    } catch (error) {
      logger.warn("Token validation failed:", error);
      return false;
    }
  }

  /**
   * Health check for Fablo REST API
   */
  async healthCheck(): Promise<{
    akademik: boolean;
    rektor: boolean;
  }> {
    const health = {
      akademik: false,
      rektor: false,
    };

    try {
      // Test akademik endpoint
      const akademikResponse = await akademikClient.get("/user/identities", {
        headers: {
          Authorization: `Bearer ${this.getAdminToken(Organization.AKADEMIK)}`,
        },
        timeout: 5000,
      });
      health.akademik = akademikResponse.status === 200;
    } catch (error) {
      logger.warn("Akademik Fablo health check failed:", error);
    }

    try {
      // Test rektor endpoint
      const rektorResponse = await rektorClient.get("/user/identities", {
        headers: {
          Authorization: `Bearer ${this.getAdminToken(Organization.REKTOR)}`,
        },
        timeout: 5000,
      });
      health.rektor = rektorResponse.status === 200;
    } catch (error) {
      logger.warn("Rektor Fablo health check failed:", error);
    }

    return health;
  }
}

// Export singleton instance
export const fabloService = new FabloService();
