import axios, { AxiosInstance } from "axios";
import FormData from "form-data";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

/**
 * IPFS Cluster configuration
 */
const ipfsClusterConfig = {
  primaryApiUrl: process.env.IPFS_CLUSTER_API_URL || "http://172.19.0.4:9094",
  fallbackApiUrl:
    process.env.IPFS_CLUSTER_FALLBACK_API_URL || "http://172.19.0.6:9094",
  gatewayUrl: process.env.IPFS_GATEWAY_URL || "http://172.19.0.3:8080",
  username: process.env.IPFS_CLUSTER_USERNAME || "",
  password: process.env.IPFS_CLUSTER_PASSWORD || "",
  jwtToken: "",
};

/**
 * Create authenticated Axios clients for the IPFS Cluster API
 */
let primaryClient = axios.create({
  baseURL: ipfsClusterConfig.primaryApiUrl,
});

let fallbackClient = axios.create({
  baseURL: ipfsClusterConfig.fallbackApiUrl,
});

/**
 * Check if IPFS Cluster API is healthy
 */
export const checkIpfsClusterHealth = async (): Promise<boolean> => {
  try {
    try {
      const response = await axios.get(
        `${ipfsClusterConfig.primaryApiUrl}/health`,
        { timeout: 2000 }
      );
      if (response.status === 204) {
        logger.info("Primary IPFS Cluster API is healthy");
        return true;
      }
    } catch (error) {
      logger.warn("Primary IPFS Cluster API health check failed");
    }

    try {
      const response = await axios.get(
        `${ipfsClusterConfig.fallbackApiUrl}/health`,
        { timeout: 2000 }
      );
      if (response.status === 204) {
        logger.info("Fallback IPFS Cluster API is healthy");
        return true;
      }
    } catch (error) {
      logger.warn("Fallback IPFS Cluster API health check failed");
    }

    logger.error("All IPFS Cluster API endpoints are unhealthy");
    return false;
  } catch (error) {
    logger.error("Error checking IPFS Cluster health:", error);
    return false;
  }
};

/**
 * Authenticate with the IPFS Cluster API using JWT
 */
export const authenticateWithCluster = async (): Promise<boolean> => {
  if (!ipfsClusterConfig.username || !ipfsClusterConfig.password) {
    logger.info(
      "No IPFS Cluster credentials provided, skipping authentication"
    );
    return true;
  }

  try {
    try {
      const response = await axios.post(
        `${ipfsClusterConfig.primaryApiUrl}/token`,
        {},
        {
          auth: {
            username: ipfsClusterConfig.username,
            password: ipfsClusterConfig.password,
          },
        }
      );

      if (response.data && response.data.token) {
        ipfsClusterConfig.jwtToken = response.data.token;

        primaryClient = axios.create({
          baseURL: ipfsClusterConfig.primaryApiUrl,
          headers: {
            Authorization: `Bearer ${ipfsClusterConfig.jwtToken}`,
          },
        });

        fallbackClient = axios.create({
          baseURL: ipfsClusterConfig.fallbackApiUrl,
          headers: {
            Authorization: `Bearer ${ipfsClusterConfig.jwtToken}`,
          },
        });

        logger.info("Successfully authenticated with IPFS Cluster API");
        return true;
      }
    } catch (primaryError) {
      logger.warn(
        "Failed to authenticate with primary IPFS Cluster API, trying fallback"
      );

      try {
        const response = await axios.post(
          `${ipfsClusterConfig.fallbackApiUrl}/token`,
          {},
          {
            auth: {
              username: ipfsClusterConfig.username,
              password: ipfsClusterConfig.password,
            },
          }
        );

        if (response.data && response.data.token) {
          ipfsClusterConfig.jwtToken = response.data.token;

          primaryClient = axios.create({
            baseURL: ipfsClusterConfig.primaryApiUrl,
            headers: {
              Authorization: `Bearer ${ipfsClusterConfig.jwtToken}`,
            },
          });

          fallbackClient = axios.create({
            baseURL: ipfsClusterConfig.fallbackApiUrl,
            headers: {
              Authorization: `Bearer ${ipfsClusterConfig.jwtToken}`,
            },
          });

          logger.info(
            "Successfully authenticated with fallback IPFS Cluster API"
          );
          return true;
        }
      } catch (fallbackError) {
        logger.error(
          "Failed to authenticate with fallback IPFS Cluster API:",
          fallbackError
        );
      }
    }

    logger.error("Failed to authenticate with any IPFS Cluster API endpoint");
    return false;
  } catch (error) {
    logger.error("Error authenticating with IPFS Cluster API:", error);
    return false;
  }
};

/**
 * Get the URL for accessing content via the IPFS gateway
 */
export const getIpfsGatewayUrl = (cid: string): string => {
  return `${ipfsClusterConfig.gatewayUrl}/ipfs/${cid}`;
};

/**
 * Get the best available cluster client
 */
const getClusterClient = async (): Promise<AxiosInstance> => {
  try {
    if (
      ipfsClusterConfig.username &&
      ipfsClusterConfig.password &&
      !ipfsClusterConfig.jwtToken
    ) {
      await authenticateWithCluster();
    }

    try {
      await axios.get(`${ipfsClusterConfig.primaryApiUrl}/health`, {
        timeout: 2000,
      });
      return primaryClient;
    } catch (error) {
      await axios.get(`${ipfsClusterConfig.fallbackApiUrl}/health`, {
        timeout: 2000,
      });
      return fallbackClient;
    }
  } catch (error) {
    logger.error("No healthy IPFS Cluster endpoints available:", error);
    return primaryClient;
  }
};

/**
 * IPFS Cluster API Service
 */
export class IpfsClusterService {
  /**
   * Add content to IPFS via the Cluster API
   * @param content The content to add
   * @param options Optional configuration
   * @returns The IPFS content identifier (CID)
   */
  async add(
    content: Buffer,
    options: {
      filename?: string;
      local?: boolean;
      format?: "unixfs" | "car";
      streamChannels?: boolean;
    } = {}
  ): Promise<{ cid: string; url: string }> {
    try {
      const client = await getClusterClient();

      const formData = new FormData();
      formData.append("file", content, options.filename);

      const queryParams = new URLSearchParams();
      if (options.local !== undefined) {
        queryParams.append("local", options.local.toString());
      }
      if (options.format) {
        queryParams.append("format", options.format);
      }
      queryParams.append(
        "stream-channels",
        options.streamChannels === true ? "true" : "false"
      );

      const url = `/add?${queryParams.toString()}`;

      const response = await client.post(url, formData, {
        headers: {
          ...formData.getHeaders(),
        },
      });

      if (!response.data || !response.data.cid) {
        throw new Error("Invalid response from IPFS Cluster API");
      }

      const cid = response.data.cid;
      const gatewayUrl = getIpfsGatewayUrl(cid);

      logger.info(`Content added to IPFS with CID: ${cid}`);
      return { cid, url: gatewayUrl };
    } catch (error) {
      logger.error("Error adding content to IPFS Cluster:", error);
      throw error;
    }
  }

  /**
   * Pin a CID in the IPFS Cluster
   * @param cid The content identifier to pin
   * @returns Success status
   */
  async pin(cid: string): Promise<boolean> {
    try {
      const client = await getClusterClient();

      const response = await client.post(`/pins/${cid}`);

      if (response.status >= 200 && response.status < 300) {
        logger.info(`CID ${cid} pinned successfully`);
        return true;
      } else {
        logger.warn(`Failed to pin CID ${cid}: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error pinning CID ${cid}:`, error);
      throw error;
    }
  }

  /**
   * Unpin a CID from the IPFS Cluster
   * @param cid The content identifier to unpin
   * @returns Success status
   */
  async unpin(cid: string): Promise<boolean> {
    try {
      const client = await getClusterClient();

      const response = await client.delete(`/pins/${cid}`);

      if (response.status >= 200 && response.status < 300) {
        logger.info(`CID ${cid} unpinned successfully`);
        return true;
      } else {
        logger.warn(`Failed to unpin CID ${cid}: ${response.status}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error unpinning CID ${cid}:`, error);
      throw error;
    }
  }

  /**
   * Check if a CID is pinned in the IPFS Cluster
   * @param cid The content identifier to check
   * @returns Status information about the pin
   */
  async status(cid: string): Promise<any> {
    try {
      const client = await getClusterClient();

      const response = await client.get(`/pins/${cid}`);

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        logger.warn(`Failed to get status for CID ${cid}: ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.error(`Error getting status for CID ${cid}:`, error);
      throw error;
    }
  }

  /**
   * List all pinned CIDs in the IPFS Cluster
   * @returns Array of pinned CIDs with their status
   */
  async list(): Promise<any[]> {
    try {
      const client = await getClusterClient();

      const response = await client.get("/pins");

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      logger.error("Error listing pins:", error);
      throw error;
    }
  }

  /**
   * Recover a CID in the IPFS Cluster
   * @param cid The content identifier to recover
   * @returns Success status
   */
  async recover(cid: string): Promise<boolean> {
    try {
      const client = await getClusterClient();

      const response = await client.post(`/pins/${cid}/recover`);

      if (response.status >= 200 && response.status < 300) {
        logger.info(`CID ${cid} recovery triggered successfully`);
        return true;
      } else {
        logger.warn(
          `Failed to trigger recovery for CID ${cid}: ${response.status}`
        );
        return false;
      }
    } catch (error) {
      logger.error(`Error recovering CID ${cid}:`, error);
      throw error;
    }
  }

  /**
   * Get information about the IPFS Cluster
   * @returns Cluster information
   */
  async info(): Promise<any> {
    try {
      const client = await getClusterClient();

      const response = await client.get("/id");

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        logger.warn(`Failed to get cluster info: ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.error("Error getting cluster info:", error);
      throw error;
    }
  }
}

export const ipfsClusterService = new IpfsClusterService();

authenticateWithCluster().catch((err) => {
  logger.error("Failed to initialize IPFS Cluster authentication:", err);
});
