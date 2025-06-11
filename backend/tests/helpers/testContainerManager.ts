export class TestContainerManager {
  /**
   * Check if Fabric network is available for testing
   */
  static async checkFabricAvailability(): Promise<boolean> {
    try {
      const akademikUrl = process.env.AKADEMIK_API_URL;
      const rektorUrl = process.env.REKTOR_API_URL;

      if (!akademikUrl || !rektorUrl) {
        return false;
      }

      // Simple health check
      const fetch = require("node-fetch");
      const akademikResponse = await fetch(`${akademikUrl}/user/identities`, {
        method: "GET",
        timeout: 5000,
      }).catch(() => null);

      const rektorResponse = await fetch(`${rektorUrl}/user/identities`, {
        method: "GET",
        timeout: 5000,
      }).catch(() => null);

      return !!(akademikResponse && rektorResponse);
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for services to be ready
   */
  static async waitForServices(maxWaitTime: number = 30000): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (await this.checkFabricAvailability()) {
        return true;
      }

      // Wait 2 seconds before retry
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return false;
  }
}
