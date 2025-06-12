// tests/mocks/mockServices.ts
import { Organization } from "../../src/models/user";
import { FabloInvokeRequest } from "../../src/models/fablo";
import { TestDataGenerator } from "../helpers";
import dotenv from "dotenv";

dotenv.config();

/**
 * Mock Fablo Service for unit testing
 */
export class MockFabloService {
  private mockTokens: Map<Organization, string> = new Map();
  private mockChaincode: Map<string, any> = new Map();

  constructor() {
    // Initialize with mock tokens
    this.mockTokens.set(Organization.AKADEMIK, "mock-akademik-token");

    // Initialize mock chaincode data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Mock ijazah data
    const mockIjazah = {
      ID: "ijazah_test_001",
      ...TestDataGenerator.generateIjazahData(),
    };

    this.mockChaincode.set("ijazah_test_001", mockIjazah);

    // Mock signature data
    const mockSignature = {
      ID: "signature_test_001",
      Type: "signature",
      CID: "QmTestSignatureCID123",
      IsActive: true,
    };

    this.mockChaincode.set("signature_signature_test_001", mockSignature);
  }

  async enrollUser(
    organization: Organization,
    username: string,
    password: string
  ): Promise<string> {
    if (
      username === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      return this.mockTokens.get(organization) || "mock-token";
    }

    if (username.startsWith("test") && password.startsWith("test")) {
      return `mock-user-token-${organization}`;
    }

    throw new Error("Invalid credentials");
  }

  async reenrollUser(
    organization: Organization,
    currentToken: string
  ): Promise<string> {
    if (currentToken.includes("mock")) {
      return `renewed-${currentToken}`;
    }

    throw new Error("Invalid token for reenrollment");
  }

  async invokeChaincode(
    organization: Organization,
    userToken: string,
    request: FabloInvokeRequest
  ): Promise<any> {
    if (!userToken.includes("mock")) {
      throw new Error("Invalid token");
    }

    const { method, args } = request;

    switch (method) {
      case "IjazahContract:CreateIjazah":
        const ijazahData = JSON.parse(args[0]);
        this.mockChaincode.set(ijazahData.ID, ijazahData);
        return JSON.stringify(ijazahData);

      case "UpdateIjazah":
        const updateData = JSON.parse(args[0]);
        const existing = this.mockChaincode.get(updateData.ID);
        if (!existing) {
          throw new Error(`Ijazah with ID ${updateData.ID} tidak ditemukan`);
        }
        const updated = {
          ...existing,
          ...updateData,
          UpdatedAt: new Date().toISOString(),
        };
        this.mockChaincode.set(updateData.ID, updated);
        return JSON.stringify(updated);

      case "UpdateIjazahStatus":
        const [ijazahId, newStatus] = args;
        const ijazah = this.mockChaincode.get(ijazahId);
        if (!ijazah) {
          throw new Error(`Ijazah with ID ${ijazahId} tidak ditemukan`);
        }
        ijazah.Status = newStatus;
        ijazah.UpdatedAt = new Date().toISOString();
        return JSON.stringify(ijazah);

      case "DeleteIjazah":
        const deleteId = args[0];
        if (this.mockChaincode.has(deleteId)) {
          this.mockChaincode.delete(deleteId);
          return JSON.stringify({
            success: true,
            message: `Ijazah dengan ID ${deleteId} berhasil dihapus`,
          });
        }
        throw new Error(`Ijazah dengan ID ${deleteId} tidak ditemukan`);

      case "CreateSignature":
        const signatureData = JSON.parse(args[0]);
        const signatureKey = `signature_${signatureData.ID}`;
        signatureData.Type = "signature";
        signatureData.Owner = "test-owner";
        signatureData.CreatedAt = new Date().toISOString();
        signatureData.UpdatedAt = new Date().toISOString();
        this.mockChaincode.set(signatureKey, signatureData);
        return JSON.stringify(signatureData);

      case "UpdateSignature":
        const updateSigData = JSON.parse(args[0]);
        const sigKey = `signature_${updateSigData.ID}`;
        const existingSig = this.mockChaincode.get(sigKey);
        if (!existingSig) {
          throw new Error(
            `Tanda tangan dengan ID ${updateSigData.ID} tidak ditemukan`
          );
        }
        const updatedSig = {
          ...existingSig,
          ...updateSigData,
          UpdatedAt: new Date().toISOString(),
        };
        this.mockChaincode.set(sigKey, updatedSig);
        return JSON.stringify(updatedSig);

      case "SetActiveSignature":
        const activeId = args[0];
        const activeKey = `signature_${activeId}`;
        const activeSig = this.mockChaincode.get(activeKey);
        if (!activeSig) {
          throw new Error(`Tanda tangan dengan ID ${activeId} tidak ditemukan`);
        }

        // Deactivate all signatures
        for (const [key, value] of this.mockChaincode.entries()) {
          if (key.startsWith("signature_") && value.Type === "signature") {
            value.IsActive = false;
          }
        }

        // Activate the target signature
        activeSig.IsActive = true;
        activeSig.UpdatedAt = new Date().toISOString();
        return JSON.stringify(activeSig);

      case "DeleteSignature":
        const deleteSigId = args[0];
        const deleteSigKey = `signature_${deleteSigId}`;
        if (this.mockChaincode.has(deleteSigKey)) {
          this.mockChaincode.delete(deleteSigKey);
          return JSON.stringify({
            success: true,
            message: `Tanda tangan dengan ID ${deleteSigId} berhasil dihapus`,
          });
        }
        throw new Error(
          `Tanda tangan dengan ID ${deleteSigId} tidak ditemukan`
        );

      default:
        throw new Error(`Method ${method} not implemented in mock`);
    }
  }

  async queryChaincode(
    organization: Organization,
    userToken: string,
    request: FabloInvokeRequest
  ): Promise<any> {
    if (!userToken.includes("mock")) {
      throw new Error("Invalid token");
    }

    const { method, args } = request;

    switch (method) {
      case "ReadIjazah":
        const ijazahId = args[0];
        const ijazah = this.mockChaincode.get(ijazahId);
        if (!ijazah) {
          return null;
        }
        return JSON.stringify(ijazah);

      case "GetAllIjazah":
        const allIjazah = Array.from(this.mockChaincode.values()).filter(
          (item) => item.Type === "certificate"
        );
        return JSON.stringify(allIjazah);

      case "GetIjazahByStatus":
        const status = args[0];
        const ijazahByStatus = Array.from(this.mockChaincode.values()).filter(
          (item) => item.Type === "certificate" && item.Status === status
        );
        return JSON.stringify(ijazahByStatus);

      case "ReadSignature":
        const signatureId = args[0];
        const signature = this.mockChaincode.get(`signature_${signatureId}`);
        if (!signature) {
          return null;
        }
        return JSON.stringify(signature);

      case "GetAllSignatures":
        const allSignatures = Array.from(this.mockChaincode.values()).filter(
          (item) => item.Type === "signature"
        );
        return JSON.stringify(allSignatures);

      case "GetActiveSignature":
        const activeSignature = Array.from(this.mockChaincode.values()).find(
          (item) => item.Type === "signature" && item.IsActive === true
        );
        if (!activeSignature) {
          throw new Error("Tidak ada tanda tangan aktif yang ditemukan");
        }
        return JSON.stringify(activeSignature);

      case "GetAllAssets": // For token validation
        return JSON.stringify([]);

      default:
        throw new Error(`Query method ${method} not implemented in mock`);
    }
  }

  // Helper method to get mock data for testing
  getMockData(key: string): any {
    return this.mockChaincode.get(key);
  }

  // Helper method to clear mock data
  clearMockData(): void {
    this.mockChaincode.clear();
    this.initializeMockData();
  }

  // Helper method to add mock data
  addMockData(key: string, data: any): void {
    this.mockChaincode.set(key, data);
  }
}

// Export instances for use in tests
export const mockFabloService = new MockFabloService();
