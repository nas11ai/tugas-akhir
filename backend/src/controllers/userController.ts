import { Request, Response } from "express";
import { validationResult } from "express-validator";
import { logger } from "../utils/logger";
import {
  userService,
  User,
  UserCredentials,
  Organization,
  Role,
  UserWithCredentials,
} from "../services/userService";
import { fabloService } from "@/services/fabloService";

/**
 * Create a new user
 */
export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
      return;
    }

    const userData = req.body;

    // Create user without credentials initially
    const newUser: Omit<User, "createdAt" | "updatedAt"> = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      photoURL: userData.photoURL,
      role: userData.role as Role,
      organization: userData.organization as Organization,
      isActive: userData.isActive !== undefined ? userData.isActive : true,
    };

    const user = await userService.createUser(newUser);

    logger.info(`User ${user.uid} created successfully`);

    res.status(201).json({
      success: true,
      data: {
        message: "User created successfully",
        user: user,
      },
    });
  } catch (error) {
    logger.error("Error creating user:", error);

    if (error instanceof Error && error.message.includes("already exists")) {
      res.status(409).json({
        success: false,
        error: "User with this UID already exists",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to create user",
    });
  }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { uid } = req.user!;

    const userProfile: UserWithCredentials | null =
      await userService.getUserWithCredentials(uid);

    if (!userProfile) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.json({
      success: true,
      data: userProfile,
    });
  } catch (error) {
    logger.error("Error getting current user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user profile",
    });
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { uid } = req.params;

    const user = await userService.getUserById(uid);

    if (!user) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    logger.error("Error getting user by ID:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get user",
    });
  }
};

/**
 * Enroll user
 */

export const enrollFabricCA = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const token = await fabloService.enrollUser(
      req.body.organization as Organization,
      req.body.username as string,
      req.body.password as string
    );

    res.json({
      success: true,
      data: {
        message: "User enrolled successfully",
        token: token,
      },
    });
  } catch (error) {
    logger.error("Error enrolling user:", error);
    res.status(500).json({
      success: false,
      error: "Failed to enroll user",
    });
  }
};

/**
 * Update user profile
 */
export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
      return;
    }

    const { uid } = req.params;
    const updateData = req.body;
    const currentUser = req.user!;

    // Users can only update their own profile unless they're admin
    if (currentUser.uid !== uid && currentUser.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "You can only update your own profile",
      });
      return;
    }

    // Only admins can change role and organization
    if (currentUser.role !== "admin") {
      delete updateData.role;
      delete updateData.organization;
      delete updateData.isActive;
    }

    const updatedUser = await userService.updateUser(uid, updateData);

    logger.info(`User ${uid} updated successfully`);

    res.json({
      success: true,
      data: {
        message: "User updated successfully",
        user: updatedUser,
      },
    });
  } catch (error) {
    logger.error("Error updating user:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to update user",
    });
  }
};

/**
 * Set user credentials (certificate and private key)
 */
export const setUserCredentials = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: errors.array(),
      });
      return;
    }

    const { uid } = req.params;
    const { username, password } = req.body;
    const currentUser = req.user!;

    // Only admins can set credentials for other users
    if (currentUser.uid !== uid && currentUser.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "You can only set credentials for your own account",
      });
      return;
    }

    const credentials: UserCredentials = {
      username,
      password,
    };

    await userService.setUserCredentials(uid, credentials);

    logger.info(`Credentials set for user ${uid}`);

    res.json({
      success: true,
      data: {
        message: "User credentials set successfully",
      },
    });
  } catch (error) {
    logger.error("Error setting user credentials:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to set user credentials",
    });
  }
};

/**
 * Remove user credentials
 */
export const removeUserCredentials = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { uid } = req.params;
    const currentUser = req.user!;

    // Only admins can remove credentials for other users
    if (currentUser.uid !== uid && currentUser.role !== "admin") {
      res.status(403).json({
        success: false,
        error: "You can only remove credentials for your own account",
      });
      return;
    }

    await userService.removeUserCredentials(uid);

    logger.info(`Credentials removed for user ${uid}`);

    res.json({
      success: true,
      data: {
        message: "User credentials removed successfully",
      },
    });
  } catch (error) {
    logger.error("Error removing user credentials:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove user credentials",
    });
  }
};

/**
 * Get users by organization (admin only)
 */
export const getUsersByOrganization = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { organization } = req.params;

    if (!Object.values(Organization).includes(organization as Organization)) {
      res.status(400).json({
        success: false,
        error: "Invalid organization",
      });
      return;
    }

    const users = await userService.getUsersByOrganization(
      organization as Organization
    );

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("Error getting users by organization:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get users",
    });
  }
};

/**
 * Get active users (admin only)
 */
export const getActiveUsers = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const users = await userService.getActiveUsers();

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.error("Error getting active users:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get active users",
    });
  }
};

/**
 * Activate user (admin only)
 */
export const activateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { uid } = req.params;

    await userService.activateUser(uid);

    logger.info(`User ${uid} activated`);

    res.json({
      success: true,
      data: {
        message: "User activated successfully",
      },
    });
  } catch (error) {
    logger.error("Error activating user:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to activate user",
    });
  }
};

/**
 * Deactivate user (admin only)
 */
export const deactivateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { uid } = req.params;

    await userService.deactivateUser(uid);

    logger.info(`User ${uid} deactivated`);

    res.json({
      success: true,
      data: {
        message: "User deactivated successfully",
      },
    });
  } catch (error) {
    logger.error("Error deactivating user:", error);

    if (error instanceof Error && error.message.includes("not found")) {
      res.status(404).json({
        success: false,
        error: "User not found",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to deactivate user",
    });
  }
};
