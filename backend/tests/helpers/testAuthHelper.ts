import { User } from "@/models/user";
import { TestDataGenerator } from "./testDataGenerator";

export class TestAuthHelper {
  /**
   * Generate mock JWT token for testing
   */
  static generateMockJWT(userId: string = "test-user"): string {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" })
    ).toString("base64");
    const payload = Buffer.from(
      JSON.stringify({
        uid: userId,
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString("base64");
    const signature = "mock-signature";

    return `${header}.${payload}.${signature}`;
  }

  /**
   * Create mock request user object
   */
  static createMockUser(overrides?: Partial<User>): User {
    return {
      ...TestDataGenerator.generateUser(overrides),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}
