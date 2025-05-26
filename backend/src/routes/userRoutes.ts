import { Router } from "express";
import { authenticate, requireAdmin } from "../middlewares/auth";
import {
  validate,
  validateUidParam,
  validateUserCredentials,
  validateCreateUser,
  validateUpdateUser,
  validateOrganizationParam,
  enrollUserValidation,
} from "../middlewares/validation";
import {
  createUser,
  getCurrentUser,
  getUserById,
  updateUser,
  setUserCredentials,
  removeUserCredentials,
  getUsersByOrganization,
  getActiveUsers,
  activateUser,
  deactivateUser,
  enrollFabricCA,
} from "../controllers/userController";

const router = Router();

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Admin only
 */
router.post("/", requireAdmin, validate(validateCreateUser), createUser);

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private (authenticated users)
 */
router.get("/me", authenticate, getCurrentUser);

/**
 * @route   GET /api/users/:uid
 * @desc    Get user by ID
 * @access  Private (authenticated users)
 */
router.get(
  "/:uid",
  authenticate,
  validate(validateUidParam),
  getUserById
);

/**
 * @route   PUT /api/users/:uid
 * @desc    Update user profile
 * @access  Private (users can update own profile, admin can update any)
 */
router.put(
  "/:uid",
  authenticate,
  validate(validateUidParam),
  validate(validateUpdateUser),
  updateUser
);

/**
 * @route   POST /api/users/:uid/credentials
 * @desc    Set user credentials (fabric username/password)
 * @access  Private (users can set own credentials, admin can set any)
 */
router.post(
  "/:uid/credentials",
  authenticate,
  validate(validateUidParam),
  validate(validateUserCredentials),
  setUserCredentials
);

/**
 * @route   DELETE /api/users/:uid/credentials
 * @desc    Remove user credentials
 * @access  Private (users can remove own credentials, admin can remove any)
 */
router.delete(
  "/:uid/credentials",
  authenticate,
  validate(validateUidParam),
  removeUserCredentials
);

/**
 * @route   GET /api/users/organization/:organization
 * @desc    Get users by organization
 * @access  Admin only
 */
router.get(
  "/organization/:organization",
  authenticate,
  requireAdmin,
  validate(validateOrganizationParam),
  getUsersByOrganization
);

/**
 * @route   GET /api/users/active
 * @desc    Get all active users
 * @access  Admin only
 */
router.get(
  "/active",
  authenticate,
  requireAdmin,
  getActiveUsers
);

/**
 * @route   PUT /api/users/:uid/activate
 * @desc    Activate user
 * @access  Admin only
 */
router.put(
  "/:uid/activate",
  authenticate,
  requireAdmin,
  validate(validateUidParam),
  activateUser
);

/**
 * @route   PUT /api/users/:uid/deactivate
 * @desc    Deactivate user
 * @access  Admin only
 */
router.put(
  "/:uid/deactivate",
  authenticate,
  requireAdmin,
  validate(validateUidParam),
  deactivateUser
);

/**
 * @route   POST /api/users/enroll-fabric-ca
 * @desc    Get Fabric CA access token
 * @access  Akademik and Rektor only
 */

router.post(
  "/enroll-fabric-ca",
  authenticate,
  validate(enrollUserValidation),
  enrollFabricCA
);

export default router;
