import admin from "firebase-admin";
import { logger } from "../utils/logger";

try {
  const serviceAccount = require("./serviceAccountKey.json");

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  logger.info("Firebase Admin SDK initialized successfully");
} catch (error) {
  logger.error("Error initializing Firebase Admin SDK:", error);
  process.exit(1);
}

// Firestore database instance
export const db = admin.firestore();

// Authentication instance
export const auth = admin.auth();

export default admin;
