import { Router } from "express";
import multer from "multer";
import { signatureController } from "../controllers/signatureController";
import { authenticate, requireRektor } from "../middlewares/auth";
import {
  validate,
  validateIdParam,
  validateCreateSignature,
  validateUpdateSignature,
  validateUrl,
} from "../middlewares/validation";

// Configure multer for signature file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit for signature files
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files for signature upload
    if (file.fieldname === "signature") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for signature upload"));
      }
    } else {
      cb(new Error("Unexpected field"));
    }
  },
});

const router = Router();

// ===== AUTHENTICATED ROUTES (All authenticated users can view) =====

/**
 * @route   GET /api/signature/active
 * @desc    Get active signature
 * @access  All authenticated users
 */
router.get(
  "/active",
  authenticate,
  signatureController.getActiveSignature.bind(signatureController)
);

/**
 * @route   GET /api/signature/:id
 * @desc    Get signature by ID
 * @access  All authenticated users
 */
router.get(
  "/:id",
  authenticate,
  validate(validateIdParam),
  signatureController.getSignature.bind(signatureController)
);

/**
 * @route   GET /api/signature
 * @desc    Get all signatures
 * @access  All authenticated users
 */
router.get(
  "/",
  authenticate,
  signatureController.getAllSignatures.bind(signatureController)
);

// ===== REKTOR ONLY ROUTES =====

/**
 * @route   POST /api/signature
 * @desc    Create new signature
 * @access  REKTOR only
 */
router.post(
  "/",
  authenticate,
  requireRektor,
  validate(validateCreateSignature),
  signatureController.createSignature.bind(signatureController)
);

/**
 * @route   POST /api/signature/upload
 * @desc    Upload signature file and create signature record
 * @access  REKTOR only
 */
router.post(
  "/upload",
  authenticate,
  requireRektor,
  upload.single("signature"), // Required signature file upload
  signatureController.uploadSignature.bind(signatureController)
);

/**
 * @route   PUT /api/signature/:id
 * @desc    Update existing signature
 * @access  REKTOR only
 */
router.put(
  "/:id",
  authenticate,
  requireRektor,
  validate(validateIdParam),
  validate(validateUpdateSignature),
  signatureController.updateSignature.bind(signatureController)
);

/**
 * @route   PUT /api/signature/:id/activate
 * @desc    Set signature as active
 * @access  REKTOR only
 */
router.put(
  "/:id/activate",
  authenticate,
  requireRektor,
  validate(validateIdParam),
  signatureController.setActiveSignature.bind(signatureController)
);

/**
 * @route   PUT /api/signature/:id/deactivate
 * @desc    Deactivate signature
 * @access  REKTOR only
 */
router.put(
  "/:id/deactivate",
  authenticate,
  requireRektor,
  validate(validateIdParam),
  signatureController.deactivateSignature.bind(signatureController)
);

/**
 * @route   DELETE /api/signature/:id
 * @desc    Delete signature
 * @access  REKTOR only
 */
router.delete(
  "/:id",
  authenticate,
  requireRektor,
  validate(validateIdParam),
  signatureController.deleteSignature.bind(signatureController)
);

/**
 * @route   GET /api/signature/stats
 * @desc    Get signature usage statistics
 * @access  REKTOR only
 */
router.get(
  "/stats",
  authenticate,
  requireRektor,
  signatureController.getSignatureStats.bind(signatureController)
);

/**
 * @route   POST /api/signature/validate-url
 * @desc    Validate signature URL accessibility
 * @access  REKTOR only
 */
router.post(
  "/validate-url",
  authenticate,
  requireRektor,
  validate(validateUrl),
  signatureController.validateSignatureUrl.bind(signatureController)
);

export default router;
