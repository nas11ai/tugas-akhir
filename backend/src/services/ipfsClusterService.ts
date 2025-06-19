import FormData from "form-data";
import { makeClusterRequest, getIpfsGatewayUrl } from "../configs/ipfsCluster";
import { logger } from "../utils/logger";

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
      const formData = new FormData();
      formData.append("file", content, options.filename || "file");

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

      const endpoint = `/add?${queryParams.toString()}`;

      const response = await makeClusterRequest("POST", endpoint, formData, {
        ...formData.getHeaders(),
      });

      if (
        !response.data ||
        !Array.isArray(response.data) ||
        !response.data[0].cid
      ) {
        throw new Error("Invalid response from IPFS Cluster API");
      }

      const cid = response.data[0].cid;
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
      const response = await makeClusterRequest("POST", `/pins/${cid}`);

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
      const response = await makeClusterRequest("DELETE", `/pins/${cid}`);

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
   * Check local status of a CID
   * @param cid The content identifier to check
   * @returns Status information about the pin
   */
  async status(cid: string): Promise<any> {
    try {
      const response = await makeClusterRequest("GET", `/pins/${cid}`);

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
   * List all tracked CIDs (local status)
   * @returns Array of pinned CIDs with their status
   */
  async list(): Promise<any[]> {
    try {
      const response = await makeClusterRequest("GET", "/pins");

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
   * Get allocations (pinset) - shows pins and their allocations
   * @returns Array of pins and their allocations
   */
  async getAllocations(): Promise<any[]> {
    try {
      const response = await makeClusterRequest("GET", "/allocations");

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      logger.error("Error getting allocations:", error);
      throw error;
    }
  }

  /**
   * Get single pin allocation
   * @param cid The content identifier
   * @returns Allocation information
   */
  async getAllocation(cid: string): Promise<any> {
    try {
      const response = await makeClusterRequest("GET", `/allocations/${cid}`);

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        logger.warn(
          `Failed to get allocation for CID ${cid}: ${response.status}`
        );
        return null;
      }
    } catch (error) {
      logger.error(`Error getting allocation for CID ${cid}:`, error);
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
      const response = await makeClusterRequest("POST", `/pins/${cid}/recover`);

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
   * Recover all pins in the cluster
   * @returns Success status
   */
  async recoverAll(): Promise<boolean> {
    try {
      const response = await makeClusterRequest("POST", "/pins/recover");

      if (response.status >= 200 && response.status < 300) {
        logger.info("All pins recovery triggered successfully");
        return true;
      } else {
        logger.warn(
          `Failed to trigger recovery for all pins: ${response.status}`
        );
        return false;
      }
    } catch (error) {
      logger.error("Error recovering all pins:", error);
      throw error;
    }
  }

  /**
   * Get information about the IPFS Cluster peer
   * @returns Cluster peer information
   */
  async info(): Promise<any> {
    try {
      const response = await makeClusterRequest("GET", "/id");

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

  /**
   * Get cluster version
   * @returns Version information
   */
  async getVersion(): Promise<any> {
    try {
      const response = await makeClusterRequest("GET", "/version");

      if (response.status >= 200 && response.status < 300) {
        return response.data;
      } else {
        logger.warn(`Failed to get cluster version: ${response.status}`);
        return null;
      }
    } catch (error) {
      logger.error("Error getting cluster version:", error);
      throw error;
    }
  }

  /**
   * Get cluster peers
   * @returns Array of cluster peers
   */
  async getPeers(): Promise<any[]> {
    try {
      const response = await makeClusterRequest("GET", "/peers");

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      logger.error("Error getting peers:", error);
      throw error;
    }
  }

  /**
   * Get health alerts
   * @returns Array of alerts
   */
  async getHealthAlerts(): Promise<any[]> {
    try {
      const response = await makeClusterRequest("GET", "/health/alerts");

      if (response.data && Array.isArray(response.data)) {
        return response.data;
      } else {
        return [];
      }
    } catch (error) {
      logger.error("Error getting health alerts:", error);
      throw error;
    }
  }
}

export const ipfsClusterService = new IpfsClusterService();
