import axios, { AxiosInstance } from "axios";
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
export const getClusterClient = async (): Promise<AxiosInstance> => {
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

authenticateWithCluster().catch((err) => {
  logger.error("Failed to initialize IPFS Cluster authentication:", err);
});
