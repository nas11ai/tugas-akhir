import { Request, Response, NextFunction } from "express";
import { auth, db } from "../configs/firebase";
import { logger } from "../utils/logger";
import { Organization } from "../models/user";

// Extend Request interface to include user and token
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        displayName: string;
        photoURL?: string;
        role: string;
        organization: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
      };
      token?: string;
    }
  }
}

/**
 * Authentication middleware
 * Verifies Firebase JWT token and loads user data
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized: No token provided",
      });
      return;
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    // Verify token
    const decodedToken = await auth.verifyIdToken(token);
    const uid = decodedToken.uid;

    // Get user data from Firestore
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      res.status(403).json({
        success: false,
        message: "Forbidden: User not registered in the system",
      });
      return;
    }

    const userData = userDoc.data() as any;

    // Check if user is active
    if (!userData.isActive) {
      res.status(403).json({
        success: false,
        message: "Forbidden: User account is inactive",
      });
      return;
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
    res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid token",
    });
    return;
  }
};

/**
 * Authorization middleware - requires admin role
 */
export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== "admin") {
    res.status(403).json({
      success: false,
      error: "Admin access required",
    });
    return;
  }
  next();
};

/**
 * Authorization middleware - requires specific role
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      res.status(403).json({
        success: false,
        error: `${role} role required`,
      });
      return;
    }
    next();
  };
};

/**
 * Authorization middleware - requires specific organization
 */
export const requireOrganization = (organizations: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !organizations.includes(req.user.organization)) {
      res.status(403).json({
        success: false,
        error: `${organizations.join(" or ")} organization access required`,
      });
      return;
    }
    next();
  };
};
