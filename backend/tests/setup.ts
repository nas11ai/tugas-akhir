import { logger } from "@/utils/logger";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

// Global test setup
beforeAll(async () => {
  // Set test environment
  process.env.NODE_ENV = "test";

  // Set default test values
  process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "adminpw";
  process.env.BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

  // Fabric network configuration for tests
  process.env.AKADEMIK_API_URL =
    process.env.AKADEMIK_API_URL || "http://localhost:8800";
  process.env.REKTOR_API_URL =
    process.env.REKTOR_API_URL || "http://localhost:8801";

  logger.info("Test environment setup completed");
});

// Global test cleanup
afterAll(async () => {
  logger.info("Test environment cleanup completed");
});

// Increase timeout for integration tests
jest.setTimeout(30000);
