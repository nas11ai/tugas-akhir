import { afterEach, jest } from "@jest/globals";
import dotenv from "dotenv";

dotenv.config();

// Mock environment variables
process.env.NODE_ENV = "test";
process.env.PORT = "3001";
process.env.FRONTEND_URL = "http://localhost:3000";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_PASSWORD = "adminpw";
process.env.IPFS_GATEWAY_URL = "https://8c87-36-85-6-24.ngrok-free.app";

// Mock Firebase Admin SDK
jest.mock("firebase-admin", () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
  },
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    getUser: jest.fn(),
    createCustomToken: jest.fn(),
    setCustomUserClaims: jest.fn(),
  })),
  firestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      get: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
    })),
  })),
}));

// Mock services
jest.mock("../src/services/fabricService", () => ({
  fabricService: {
    createIjazah: jest.fn(),
    updateIjazah: jest.fn(),
    getIjazah: jest.fn(),
    getAllIjazah: jest.fn(),
    getIjazahByStatus: jest.fn(),
    approveIjazah: jest.fn(),
    rejectIjazah: jest.fn(),
    activateIjazah: jest.fn(),
    deleteIjazah: jest.fn(),
    createSignature: jest.fn(),
    updateSignature: jest.fn(),
    getSignature: jest.fn(),
    getAllSignatures: jest.fn(),
    getActiveSignature: jest.fn(),
    setActiveSignature: jest.fn(),
    deleteSignature: jest.fn(),
    getCertificateDownloadUrl: jest.fn(),
    getPhotoDownloadUrl: jest.fn(),
    healthCheck: jest.fn(),
  },
}));

jest.mock("../src/services/userService", () => ({
  userService: {
    createUser: jest.fn(),
    getUserById: jest.fn(),
    updateUser: jest.fn(),
    setUserCredentials: jest.fn(),
    removeUserCredentials: jest.fn(),
    getUsersByOrganization: jest.fn(),
    getActiveUsers: jest.fn(),
    activateUser: jest.fn(),
    deactivateUser: jest.fn(),
  },
}));

jest.mock("../src/services/ipfsClusterService", () => ({
  ipfsClusterService: {
    add: jest.fn(),
    pin: jest.fn(),
    unpin: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock logger
jest.mock("../src/utils/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Global test timeout
jest.setTimeout(30000);

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
