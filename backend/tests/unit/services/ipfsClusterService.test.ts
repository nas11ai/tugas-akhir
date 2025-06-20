// tests/unit/services/ipfsClusterService.test.ts
import { IpfsClusterService } from "../../../src/services/ipfsClusterService";
import {
  makeClusterRequest,
  getIpfsGatewayUrl,
} from "../../../src/configs/ipfsCluster";
import { logger } from "../../../src/utils/logger";
import dotenv from "dotenv";

dotenv.config();

// Mock dependencies
jest.mock("../../../src/configs/ipfsCluster");
jest.mock("../../../src/utils/logger");

const mockMakeClusterRequest = makeClusterRequest as jest.MockedFunction<
  typeof makeClusterRequest
>;
const mockGetIpfsGatewayUrl = getIpfsGatewayUrl as jest.MockedFunction<
  typeof getIpfsGatewayUrl
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe("IpfsClusterService", () => {
  let ipfsClusterService: IpfsClusterService;

  beforeEach(() => {
    ipfsClusterService = new IpfsClusterService();
    jest.clearAllMocks();
  });

  describe("add", () => {
    it("should add content to IPFS cluster successfully", async () => {
      // Arrange
      const mockContent = Buffer.from("test content");
      const mockCid = "QmTestCID123";
      const mockGatewayUrl = `${process.env.IPFS_GATEWAY_URL || "http://localhost:8080"
        }/ipfs/${mockCid}`;

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: [{ cid: mockCid }],
      } as any);

      mockGetIpfsGatewayUrl.mockReturnValue(mockGatewayUrl);

      // Act
      const result = await ipfsClusterService.add(mockContent);

      // Assert
      expect(result).toEqual({
        cid: mockCid,
        url: mockGatewayUrl,
      });
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "POST",
        expect.stringContaining("/add"),
        expect.any(Object),
        expect.any(Object)
      );
      expect(mockGetIpfsGatewayUrl).toHaveBeenCalledWith(mockCid);
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Content added to IPFS with CID: ${mockCid}`
      );
    });

    it("should add content with custom options", async () => {
      // Arrange
      const mockContent = Buffer.from("test content");
      const mockCid = "QmTestCID123";
      const mockGatewayUrl = `http://localhost:8080/ipfs/${mockCid}`;
      const options = {
        filename: "test.txt",
        local: true,
        format: "unixfs" as const,
        streamChannels: true,
      };

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: [{ cid: mockCid }],
      } as any);

      mockGetIpfsGatewayUrl.mockReturnValue(mockGatewayUrl);

      // Act
      const result = await ipfsClusterService.add(mockContent, options);

      // Assert
      expect(result).toEqual({
        cid: mockCid,
        url: mockGatewayUrl,
      });
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "POST",
        expect.stringContaining(
          "/add?local=true&format=unixfs&stream-channels=true"
        ),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it("should handle invalid response from IPFS cluster", async () => {
      // Arrange
      const mockContent = Buffer.from("test content");

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: null,
      } as any);

      // Act & Assert
      await expect(ipfsClusterService.add(mockContent)).rejects.toThrow(
        "Invalid response from IPFS Cluster API"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error adding content to IPFS Cluster:",
        expect.any(Error)
      );
    });

    it("should handle network error during add", async () => {
      // Arrange
      const mockContent = Buffer.from("test content");
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.add(mockContent)).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error adding content to IPFS Cluster:",
        networkError
      );
    });
  });

  describe("pin", () => {
    it("should pin CID successfully", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
      } as any);

      // Act
      const result = await ipfsClusterService.pin(mockCid);

      // Assert
      expect(result).toBe(true);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "POST",
        `/pins/${mockCid}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `CID ${mockCid} pinned successfully`
      );
    });

    it("should handle pin failure with non-success status", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 400,
      } as any);

      // Act
      const result = await ipfsClusterService.pin(mockCid);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to pin CID ${mockCid}: 400`
      );
    });

    it("should handle network error during pin", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.pin(mockCid)).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error pinning CID ${mockCid}:`,
        networkError
      );
    });
  });

  describe("unpin", () => {
    it("should unpin CID successfully", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
      } as any);

      // Act
      const result = await ipfsClusterService.unpin(mockCid);

      // Assert
      expect(result).toBe(true);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "DELETE",
        `/pins/${mockCid}`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `CID ${mockCid} unpinned successfully`
      );
    });

    it("should handle unpin failure", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 404,
      } as any);

      // Act
      const result = await ipfsClusterService.unpin(mockCid);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to unpin CID ${mockCid}: 404`
      );
    });

    it("should handle network error during unpin", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.unpin(mockCid)).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error unpinning CID ${mockCid}:`,
        networkError
      );
    });
  });

  describe("status", () => {
    it("should get CID status successfully", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const mockStatusData = {
        cid: mockCid,
        status: "pinned",
        peer_map: {},
      };

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockStatusData,
      } as any);

      // Act
      const result = await ipfsClusterService.status(mockCid);

      // Assert
      expect(result).toEqual(mockStatusData);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "GET",
        `/pins/${mockCid}`
      );
    });

    it("should return null for non-existent CID", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 404,
      } as any);

      // Act
      const result = await ipfsClusterService.status(mockCid);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to get status for CID ${mockCid}: 404`
      );
    });

    it("should handle network error during status check", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.status(mockCid)).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting status for CID ${mockCid}:`,
        networkError
      );
    });
  });

  describe("list", () => {
    it("should list all pins successfully", async () => {
      // Arrange
      const mockPinsList = [
        { cid: "QmTestCID1", status: "pinned" },
        { cid: "QmTestCID2", status: "pinning" },
      ];

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockPinsList,
      } as any);

      // Act
      const result = await ipfsClusterService.list();

      // Assert
      expect(result).toEqual(mockPinsList);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith("GET", "/pins");
    });

    it("should return empty array for invalid response", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: null,
      } as any);

      // Act
      const result = await ipfsClusterService.list();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle network error during list", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.list()).rejects.toThrow("Network error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error listing pins:",
        networkError
      );
    });
  });

  describe("getAllocations", () => {
    it("should get all allocations successfully", async () => {
      // Arrange
      const mockAllocations = [
        { cid: "QmTestCID1", allocations: ["peer1", "peer2"] },
        { cid: "QmTestCID2", allocations: ["peer1", "peer3"] },
      ];

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockAllocations,
      } as any);

      // Act
      const result = await ipfsClusterService.getAllocations();

      // Assert
      expect(result).toEqual(mockAllocations);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "GET",
        "/allocations"
      );
    });

    it("should return empty array for invalid response", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: null,
      } as any);

      // Act
      const result = await ipfsClusterService.getAllocations();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle network error during getAllocations", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.getAllocations()).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting allocations:",
        networkError
      );
    });
  });

  describe("getAllocation", () => {
    it("should get single allocation successfully", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const mockAllocation = {
        cid: mockCid,
        allocations: ["peer1", "peer2"],
      };

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockAllocation,
      } as any);

      // Act
      const result = await ipfsClusterService.getAllocation(mockCid);

      // Assert
      expect(result).toEqual(mockAllocation);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "GET",
        `/allocations/${mockCid}`
      );
    });

    it("should return null for non-existent allocation", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 404,
      } as any);

      // Act
      const result = await ipfsClusterService.getAllocation(mockCid);

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to get allocation for CID ${mockCid}: 404`
      );
    });

    it("should handle network error during getAllocation", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.getAllocation(mockCid)).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error getting allocation for CID ${mockCid}:`,
        networkError
      );
    });
  });

  describe("recover", () => {
    it("should recover CID successfully", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
      } as any);

      // Act
      const result = await ipfsClusterService.recover(mockCid);

      // Assert
      expect(result).toBe(true);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "POST",
        `/pins/${mockCid}/recover`
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `CID ${mockCid} recovery triggered successfully`
      );
    });

    it("should handle recovery failure", async () => {
      // Arrange
      const mockCid = "QmTestCID123";

      mockMakeClusterRequest.mockResolvedValue({
        status: 404,
      } as any);

      // Act
      const result = await ipfsClusterService.recover(mockCid);

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        `Failed to trigger recovery for CID ${mockCid}: 404`
      );
    });

    it("should handle network error during recovery", async () => {
      // Arrange
      const mockCid = "QmTestCID123";
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.recover(mockCid)).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Error recovering CID ${mockCid}:`,
        networkError
      );
    });
  });

  describe("recoverAll", () => {
    it("should recover all pins successfully", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
      } as any);

      // Act
      const result = await ipfsClusterService.recoverAll();

      // Assert
      expect(result).toBe(true);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "POST",
        "/pins/recover"
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "All pins recovery triggered successfully"
      );
    });

    it("should handle recovery all failure", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 500,
      } as any);

      // Act
      const result = await ipfsClusterService.recoverAll();

      // Assert
      expect(result).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to trigger recovery for all pins: 500"
      );
    });

    it("should handle network error during recoverAll", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.recoverAll()).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error recovering all pins:",
        networkError
      );
    });
  });

  describe("info", () => {
    it("should get cluster info successfully", async () => {
      // Arrange
      const mockInfo = {
        id: "cluster-peer-id",
        version: "1.0.0",
        addresses: ["/ip4/127.0.0.1/tcp/9096"],
      };

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockInfo,
      } as any);

      // Act
      const result = await ipfsClusterService.info();

      // Assert
      expect(result).toEqual(mockInfo);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith("GET", "/id");
    });

    it("should return null for failed info request", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 500,
      } as any);

      // Act
      const result = await ipfsClusterService.info();

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to get cluster info: 500"
      );
    });

    it("should handle network error during info request", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.info()).rejects.toThrow("Network error");
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting cluster info:",
        networkError
      );
    });
  });

  describe("getVersion", () => {
    it("should get cluster version successfully", async () => {
      // Arrange
      const mockVersion = {
        version: "1.0.0",
        commit: "abc123",
        go_version: "go1.19",
      };

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockVersion,
      } as any);

      // Act
      const result = await ipfsClusterService.getVersion();

      // Assert
      expect(result).toEqual(mockVersion);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith("GET", "/version");
    });

    it("should return null for failed version request", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 500,
      } as any);

      // Act
      const result = await ipfsClusterService.getVersion();

      // Assert
      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        "Failed to get cluster version: 500"
      );
    });

    it("should handle network error during getVersion", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.getVersion()).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting cluster version:",
        networkError
      );
    });
  });

  describe("getPeers", () => {
    it("should get cluster peers successfully", async () => {
      // Arrange
      const mockPeers = [
        { id: "peer1", addresses: ["/ip4/127.0.0.1/tcp/9096"] },
        { id: "peer2", addresses: ["/ip4/127.0.0.1/tcp/9097"] },
      ];

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockPeers,
      } as any);

      // Act
      const result = await ipfsClusterService.getPeers();

      // Assert
      expect(result).toEqual(mockPeers);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith("GET", "/peers");
    });

    it("should return empty array for invalid response", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: null,
      } as any);

      // Act
      const result = await ipfsClusterService.getPeers();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle network error during getPeers", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.getPeers()).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting peers:",
        networkError
      );
    });
  });

  describe("getHealthAlerts", () => {
    it("should get health alerts successfully", async () => {
      // Arrange
      const mockAlerts = [
        { metric: "ping", peer: "peer1", status: "warning" },
        { metric: "disk", peer: "peer2", status: "critical" },
      ];

      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: mockAlerts,
      } as any);

      // Act
      const result = await ipfsClusterService.getHealthAlerts();

      // Assert
      expect(result).toEqual(mockAlerts);
      expect(mockMakeClusterRequest).toHaveBeenCalledWith(
        "GET",
        "/health/alerts"
      );
    });

    it("should return empty array for invalid response", async () => {
      // Arrange
      mockMakeClusterRequest.mockResolvedValue({
        status: 200,
        data: null,
      } as any);

      // Act
      const result = await ipfsClusterService.getHealthAlerts();

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle network error during health alerts request", async () => {
      // Arrange
      const networkError = new Error("Network error");

      mockMakeClusterRequest.mockRejectedValue(networkError);

      // Act & Assert
      await expect(ipfsClusterService.getHealthAlerts()).rejects.toThrow(
        "Network error"
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        "Error getting health alerts:",
        networkError
      );
    });
  });
});
