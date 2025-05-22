import FormData from "form-data";
import { getClusterClient, getIpfsGatewayUrl } from "../config/ipfsCluster";
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
