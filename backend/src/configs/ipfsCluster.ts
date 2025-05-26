import axios from "axios";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

/**
 * IPFS Cluster configuration
 */
export const ipfsClusterConfig = {
  apiUrl: process.env.IPFS_CLUSTER_API_URL || "http://172.19.0.4:9094",
  gatewayUrl: process.env.IPFS_GATEWAY_URL || "http://172.19.0.3:8080",
};

/**
 * Check if IPFS Cluster API is healthy
 */
export const checkIpfsClusterHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${ipfsClusterConfig.apiUrl}/health`, {
      timeout: 5000,
    });

    if (response.status === 204) {
      logger.info("IPFS Cluster API is healthy");
      return true;
    }

    return false;
  } catch (error) {
    logger.error("IPFS Cluster health check failed:", error);
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
 * Make HTTP request to IPFS Cluster API
 */
export const makeClusterRequest = async (
  method: "GET" | "POST" | "DELETE",
  endpoint: string,
  data?: any,
  headers?: Record<string, string>
) => {
  const url = `${ipfsClusterConfig.apiUrl}${endpoint}`;

  try {
    const config: any = {
      method,
      url,
      timeout: 30000,
    };

    if (headers) {
      config.headers = headers;
    }

    if (data) {
      config.data = data;
    }

    const response = await axios(config);
    return response;
  } catch (error) {
    logger.error(`Error making request to ${url}:`, error);
    throw error;
  }
};
