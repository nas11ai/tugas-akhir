import { logger } from "../utils/logger";
import { getIpfsGatewayUrl } from "../configs/ipfsCluster";
import { ipfsClusterService } from "./ipfsClusterService";

/**
 * Service for interacting with IPFS via the IPFS Cluster API
 */
export class IpfsService {
  /**
   * Add a file to IPFS
   * @param fileBuffer The file data as a Buffer
   * @param options Optional IPFS add options
   * @returns The IPFS content identifier (CID)
   */
  async addFile(
    fileBuffer: Buffer,
    options: { filename?: string } = {}
  ): Promise<{ cid: string; url: string }> {
    try {
      // Add file to IPFS via Cluster API
      const result = await ipfsClusterService.add(fileBuffer, {
        filename: options.filename,
        // Set local to true for faster uploads
        local: true,
        // Default format is unixfs
        format: "unixfs",
        // Avoid issues with Nginx when using stream-channels
        streamChannels: false,
      });

      logger.info(`File added to IPFS with CID: ${result.cid}`);
      return result;
    } catch (error) {
      logger.error("Error adding file to IPFS:", error);
      throw error;
    }
  }

  /**
   * Add a JSON object to IPFS
   * @param jsonData The JSON data to add
   * @param options Optional IPFS add options
   * @returns The IPFS content identifier (CID)
   */
  async addJson(
    jsonData: object,
    options: { filename?: string } = {}
  ): Promise<{ cid: string; url: string }> {
    try {
      // Convert JSON to Buffer
      const jsonBuffer = Buffer.from(JSON.stringify(jsonData));

      // Add JSON as a file
      return this.addFile(jsonBuffer, {
        filename: options.filename || "data.json",
      });
    } catch (error) {
      logger.error("Error adding JSON to IPFS:", error);
      throw error;
    }
  }

  /**
   * Get a file from IPFS (requires access to the IPFS Gateway)
   * @param cid The IPFS content identifier
   * @returns The file content as a Buffer
   */
  async getFile(cid: string): Promise<Buffer> {
    try {
      // Get the file from the IPFS Gateway
      const response = await fetch(getIpfsGatewayUrl(cid));

      if (!response.ok) {
        throw new Error(
          `Failed to get file from IPFS Gateway: ${response.status} ${response.statusText}`
        );
      }

      // Convert to buffer
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      return buffer;
    } catch (error) {
      logger.error(`Error getting file with CID ${cid} from IPFS:`, error);
      throw error;
    }
  }

  /**
   * Get a JSON object from IPFS
   * @param cid The IPFS content identifier
   * @returns The JSON object
   */
  async getJson<T = any>(cid: string): Promise<T> {
    try {
      // Get file from IPFS as Buffer
      const buffer = await this.getFile(cid);

      // Parse JSON
      return JSON.parse(buffer.toString()) as T;
    } catch (error) {
      logger.error(`Error getting JSON with CID ${cid} from IPFS:`, error);
      throw error;
    }
  }

  /**
   * Add text to IPFS
   * @param text The text to add
   * @returns The IPFS content identifier (CID)
   */
  async addText(text: string): Promise<{ cid: string; url: string }> {
    try {
      // Convert text to Buffer
      const textBuffer = Buffer.from(text);

      // Add text as a file
      return this.addFile(textBuffer, {
        filename: "text.txt",
      });
    } catch (error) {
      logger.error("Error adding text to IPFS:", error);
      throw error;
    }
  }

  /**
   * Get text from IPFS
   * @param cid The IPFS content identifier
   * @returns The text content
   */
  async getText(cid: string): Promise<string> {
    try {
      // Get file from IPFS as Buffer
      const buffer = await this.getFile(cid);

      // Convert Buffer to string
      return buffer.toString("utf-8");
    } catch (error) {
      logger.error(`Error getting text with CID ${cid} from IPFS:`, error);
      throw error;
    }
  }

  /**
   * Get the URL for accessing a file on the IPFS gateway
   * @param cid The IPFS content identifier
   * @returns The IPFS gateway URL
   */
  getGatewayUrl(cid: string): string {
    return getIpfsGatewayUrl(cid);
  }

  /**
   * Check if a file exists in IPFS by checking its pin status
   * @param cid The IPFS content identifier
   * @returns True if the file exists and is pinned
   */
  async fileExists(cid: string): Promise<boolean> {
    try {
      // Check if the CID is pinned in the cluster
      const status = await ipfsClusterService.status(cid);

      return status !== null;
    } catch (error) {
      // If there's an error, most likely the file doesn't exist
      return false;
    }
  }

  /**
   * Pin a CID in IPFS Cluster
   * @param cid The content identifier to pin
   * @returns Success status
   */
  async pinFile(cid: string): Promise<boolean> {
    try {
      return await ipfsClusterService.pin(cid);
    } catch (error) {
      logger.error(`Error pinning CID ${cid}:`, error);
      return false;
    }
  }

  /**
   * Unpin a CID from IPFS Cluster
   * @param cid The content identifier to unpin
   * @returns Success status
   */
  async unpinFile(cid: string): Promise<boolean> {
    try {
      return await ipfsClusterService.unpin(cid);
    } catch (error) {
      logger.error(`Error unpinning CID ${cid}:`, error);
      return false;
    }
  }

  /**
   * Get the status of a pin in IPFS Cluster
   * @param cid The content identifier to check
   * @returns Status information about the pin
   */
  async getPinStatus(cid: string): Promise<any> {
    try {
      return await ipfsClusterService.status(cid);
    } catch (error) {
      logger.error(`Error getting status for CID ${cid}:`, error);
      throw error;
    }
  }

  /**
   * List all pinned CIDs in IPFS Cluster
   * @returns Array of pinned CIDs with their status
   */
  async listPins(): Promise<any[]> {
    try {
      return await ipfsClusterService.list();
    } catch (error) {
      logger.error("Error listing pins:", error);
      throw error;
    }
  }

  /**
   * Recover a CID in IPFS Cluster
   * @param cid The content identifier to recover
   * @returns Success status
   */
  async recoverPin(cid: string): Promise<boolean> {
    try {
      return await ipfsClusterService.recover(cid);
    } catch (error) {
      logger.error(`Error recovering CID ${cid}:`, error);
      return false;
    }
  }
}

// Export service instance
export const ipfsService = new IpfsService();
