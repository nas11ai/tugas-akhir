import { createHelia } from "helia";
import { unixfs } from "@helia/unixfs";
import { dagJson } from "@helia/dag-json";
import { strings } from "@helia/strings";
import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";
import { webSockets } from "@libp2p/websockets";
import { noise } from "@chainsafe/libp2p-noise";
import { yamux } from "@chainsafe/libp2p-yamux";
import { multiaddr } from "@multiformats/multiaddr";
import axios from "axios";
import { logger } from "../utils/logger";
import type { PeerDiscovery } from "@libp2p/interface-peer-discovery";
import { bootstrap } from "@libp2p/bootstrap";

// Import Kubo RPC Client properly
import { create as createKuboClient } from "kubo-rpc-client";

// IPFS cluster configuration
const ipfsConfig = {
  // Primary IPFS API endpoint
  primaryApiUrl: process.env.IPFS_API_URL || "http://172.19.0.3:5001",
  // Fallback IPFS API endpoint
  fallbackApiUrl: process.env.IPFS_FALLBACK_API_URL || "http://172.19.0.5:5001",
  // IPFS Gateway URL for accessing content
  gatewayUrl: process.env.IPFS_GATEWAY_URL || "http://172.19.0.3:8080",
  // Cluster API endpoints
  clusterApiUrls: [
    process.env.IPFS_CLUSTER_API_URL || "http://172.19.0.4:9094",
    process.env.IPFS_CLUSTER_FALLBACK_API_URL || "http://172.19.0.6:9094",
  ],
  // IPFS peer multiaddresses
  peerAddresses: [
    "/ip4/172.19.0.3/tcp/4001", // ipfs0
    "/ip4/172.19.0.5/tcp/4001", // ipfs1
  ],
};

// Create Kubo RPC Clients for direct API access to IPFS nodes
const primaryIpfsClient = createKuboClient({ url: ipfsConfig.primaryApiUrl });
const fallbackIpfsClient = createKuboClient({ url: ipfsConfig.fallbackApiUrl });

let heliaNode: any;
let fs: any;
let json: any;
let str: any;

/**
 * Initialize Helia IPFS node connected to the cluster
 */
export const initializeHelia = async () => {
  try {
    // Check if we can connect to the IPFS nodes
    const canConnectToPrimary = await checkIpfsNodeHealth(
      ipfsConfig.primaryApiUrl
    );
    const canConnectToFallback =
      !canConnectToPrimary &&
      (await checkIpfsNodeHealth(ipfsConfig.fallbackApiUrl));

    if (!canConnectToPrimary && !canConnectToFallback) {
      logger.warn("Cannot connect to any IPFS node, will use embedded mode");
    }

    // Variables to store peer IDs for later connection
    let primaryPeerId: string | null = null;
    let fallbackPeerId: string | null = null;

    // Try to get peer IDs
    if (canConnectToPrimary) {
      try {
        const primaryInfo = await primaryIpfsClient.id();
        primaryPeerId = primaryInfo.id.toString();
      } catch (error) {
        logger.warn("Failed to get primary IPFS node ID:", error);
      }
    }

    if (canConnectToFallback) {
      try {
        const fallbackInfo = await fallbackIpfsClient.id();
        fallbackPeerId = fallbackInfo.id.toString();
      } catch (error) {
        logger.warn("Failed to get fallback IPFS node ID:", error);
      }
    }

    // Prepare bootstrap list
    const bootstrapList: string[] = [];

    if (primaryPeerId) {
      bootstrapList.push(`/ip4/172.19.0.3/tcp/4001/p2p/${primaryPeerId}`);
    }

    if (fallbackPeerId) {
      bootstrapList.push(`/ip4/172.19.0.5/tcp/4001/p2p/${fallbackPeerId}`);
    }

    // If no peers found, use default bootstrap nodes
    if (bootstrapList.length === 0) {
      bootstrapList.push(
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
        "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb"
      );
    }

    // Create a libp2p node connecting to the IPFS cluster
    const libp2p = await createLibp2p({
      addresses: {
        listen: ["/ip4/0.0.0.0/tcp/0"],
      },
      transports: [tcp(), webSockets()],
      connectionEncrypters: [noise()],
      streamMuxers: [yamux()],
      // Use bootstrap discovery with our prepared list
      peerDiscovery: [
        bootstrap({
          list: bootstrapList,
        }),
      ],
    });

    // Create a Helia node
    heliaNode = await createHelia({
      libp2p,
    });

    // Create interfaces for working with files, JSON, and strings
    fs = unixfs(heliaNode);
    json = dagJson(heliaNode);
    str = strings(heliaNode);

    logger.info(
      `Helia IPFS node initialized successfully with ID: ${heliaNode.libp2p.peerId.toString()}`
    );

    return true;
  } catch (error) {
    logger.error("Error initializing Helia IPFS:", error);
    throw error;
  }
};

/**
 * Check if an IPFS node is healthy
 */
const checkIpfsNodeHealth = async (apiUrl: string): Promise<boolean> => {
  try {
    const response = await axios.post(
      `${apiUrl}/api/v0/id`,
      {},
      {
        timeout: 2000, // 2 second timeout
      }
    );
    return response.status === 200;
  } catch (error) {
    return false;
  }
};

/**
 * Add content to IPFS cluster using the API
 * This is a fallback for when direct Helia node connection fails
 */
export const addToCluster = async (
  content: Buffer,
  filename?: string
): Promise<string> => {
  // Try each cluster API until one works
  for (const clusterApiUrl of ipfsConfig.clusterApiUrls) {
    try {
      const formData = new FormData();
      const blob = new Blob([content]);
      formData.append("file", blob, filename);

      const response = await axios.post(`${clusterApiUrl}/add`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data && response.data.cid) {
        return response.data.cid;
      }
    } catch (error) {
      logger.warn(
        `Failed to add content to IPFS cluster at ${clusterApiUrl}:`,
        error
      );
      // Continue to the next cluster API
    }
  }

  // If all cluster APIs fail, throw an error
  throw new Error("Failed to add content to any IPFS cluster");
};

/**
 * Pin content in the IPFS cluster
 */
export const pinToCluster = async (cid: string): Promise<boolean> => {
  // Try each cluster API until one works
  for (const clusterApiUrl of ipfsConfig.clusterApiUrls) {
    try {
      const response = await axios.post(`${clusterApiUrl}/pins/${cid}`);
      if (response.status === 200) {
        return true;
      }
    } catch (error) {
      logger.warn(
        `Failed to pin content to IPFS cluster at ${clusterApiUrl}:`,
        error
      );
      // Continue to the next cluster API
    }
  }

  // If all cluster APIs fail, return false
  return false;
};

// Function to get IPFS gateway URL for a CID
export const getIpfsGatewayUrl = (cid: string): string => {
  return `${ipfsConfig.gatewayUrl}/ipfs/${cid}`;
};

// Check IPFS health
export const checkIpfsHealth = async (): Promise<boolean> => {
  try {
    // First check if we can connect to any IPFS node
    const primaryHealth = await checkIpfsNodeHealth(ipfsConfig.primaryApiUrl);
    const fallbackHealth = await checkIpfsNodeHealth(ipfsConfig.fallbackApiUrl);

    if (!primaryHealth && !fallbackHealth) {
      logger.warn("Cannot connect to any IPFS node in the cluster");

      // If we've initialized Helia, we can still work in embedded mode
      if (heliaNode) {
        const peerId = heliaNode.libp2p.peerId.toString();
        logger.info(`Using embedded Helia IPFS node with ID: ${peerId}`);
        return true;
      }

      return false;
    }

    // Log which nodes are available
    if (primaryHealth) {
      logger.info("Primary IPFS node is healthy");
    }

    if (fallbackHealth) {
      logger.info("Fallback IPFS node is healthy");
    }

    // If Helia is not initialized yet, initialize it
    if (!heliaNode) {
      await initializeHelia();
    }

    return true;
  } catch (error) {
    logger.error("Error checking IPFS health:", error);
    return false;
  }
};

// Export the interfaces
export { heliaNode, fs, json, str, primaryIpfsClient, fallbackIpfsClient };

// Initialize Helia on module import
initializeHelia().catch((err: Error) => {
  logger.error("Failed to initialize Helia IPFS node:", err);
});
