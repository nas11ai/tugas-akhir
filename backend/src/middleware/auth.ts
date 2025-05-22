import { Request, Response, NextFunction } from "express";
import { auth, db } from "../config/firebase";
import { logger } from "../utils/logger";
import { User } from "../models/user";

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      token?: string;
    }
  }
}

/**
 * Authentication middleware to verify Firebase ID token
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User not registered in the system",
      });
    }

    const userData = userDoc.data() as any;

    // Check if user is active
    if (!userData.isActive) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: User account is inactive",
      });
    }

    // Add user data to request
    req.user = {
      uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      role: userData.role,
      organization: userData.organization,
      createdAt: userData.createdAt.toDate(),
      updatedAt: userData.updatedAt.toDate(),
      isActive: userData.isActive,
    };

    req.token = token;

    next();
  } catch (error) {
    logger.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
  }
};
