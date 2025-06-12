/**
 * Mock IPFS Cluster Service for testing
 */
export class MockIpfsClusterService {
  private mockStorage: Map<string, Buffer> = new Map();
  private mockPins: Set<string> = new Set();

  async add(
    content: Buffer,
    options?: { filename?: string; local?: boolean }
  ): Promise<{ cid: string }> {
    const cid = `Qm${Math.random().toString(36).substring(2, 15)}MockCID`;
    this.mockStorage.set(cid, content);
    return { cid };
  }

  async pin(cid: string): Promise<void> {
    if (!this.mockStorage.has(cid)) {
      throw new Error(`CID ${cid} not found`);
    }
    this.mockPins.add(cid);
  }

  async unpin(cid: string): Promise<void> {
    this.mockPins.delete(cid);
  }

  async get(cid: string): Promise<Buffer> {
    const content = this.mockStorage.get(cid);
    if (!content) {
      throw new Error(`Content with CID ${cid} not found`);
    }
    return content;
  }

  // Helper methods for testing
  getMockData(cid: string): Buffer | undefined {
    return this.mockStorage.get(cid);
  }

  isPinned(cid: string): boolean {
    return this.mockPins.has(cid);
  }

  clearMockData(): void {
    this.mockStorage.clear();
    this.mockPins.clear();
  }
}

export const mockIpfsClusterService = new MockIpfsClusterService();
