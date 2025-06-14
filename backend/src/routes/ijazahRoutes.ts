import { Router } from "express";
import multer from "multer";
import { ijazahController } from "../controllers/ijazahController";
import {
  authenticate,
  requireFabricToken,
  requireOrganization,
} from "../middlewares/auth";
import {
  validate,
  validateIdParam,
  validateCreateIjazah,
  validateUpdateIjazah,
  validateStatusUpdate,
  validateBulkIds,
  validateRejectionReason,
  validateNimParam,
} from "../middlewares/validation";
import { Organization } from "../models/user";

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for photos
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files for photo upload
    if (file.fieldname === "photo") {
      if (file.mimetype.startsWith("image/")) {
        cb(null, true);
      } else {
        cb(new Error("Only image files are allowed for photo upload"));
      }
    } else {
      cb(new Error("Unexpected field"));
    }
  },
});

const router = Router();

// ===== PUBLIC ROUTES (No Authentication Required) =====

/**
 * @route   GET /api/ijazah/:id
 * @desc    Get ijazah certificate by ID
 * @access  Public (for certificate validation)
 */
router.get(
  "/:id",
  validate(validateIdParam),
  ijazahController.getIjazah.bind(ijazahController)
);

// ===== AUTHENTICATED ROUTES (All authenticated users) =====

/**
 * @route   GET /api/ijazah
 * @desc    Get all ijazah certificates
 * @access  All authenticated users
 */
router.get(
  "/",
  authenticate,
  requireFabricToken,
  ijazahController.getAllIjazah.bind(ijazahController)
);

// ===== AKADEMIK ONLY ROUTES =====

/**
 * @route GET /api/ijazah/nim/:nim
 * @desc Get mahasiswa by NIM
 * @access AKADEMIK only
 */
router.get(
  "/nim/:nim",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK]),
  validate(validateNimParam),
  ijazahController.findMahasiswaByNim.bind(ijazahController)
);

/**
 * @route   POST /api/ijazah
 * @desc    Create new ijazah certificate
 * @access  AKADEMIK only
 */
router.post(
  "/",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK]),
  upload.single("photo"), // Optional photo upload
  validate(validateCreateIjazah),
  ijazahController.createIjazah.bind(ijazahController)
);

/**
 * @route   PUT /api/ijazah/:id
 * @desc    Update existing ijazah certificate
 * @access  AKADEMIK only (cannot update if status is "menunggu tanda tangan rektor")
 */
router.put(
  "/:id",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK]),
  validate(validateIdParam),
  upload.single("photo"), // Optional photo upload for update
  validate(validateUpdateIjazah),
  ijazahController.updateIjazah.bind(ijazahController)
);

/**
 * @route   DELETE /api/ijazah/:id
 * @desc    Delete ijazah certificate
 * @access  AKADEMIK only
 */
router.delete(
  "/:id",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK]),
  validate(validateIdParam),
  ijazahController.deleteIjazah.bind(ijazahController)
);

export default router;
