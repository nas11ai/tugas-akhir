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

/**
 * @route   GET /api/ijazah/:id/validate
 * @desc    Validate ijazah certificate for public verification
 * @access  Public (no authentication required)
 */
router.get(
  "/:id/validate",
  validate(validateIdParam),
  ijazahController.validateIjazah.bind(ijazahController)
);

/**
 * @route   GET /api/ijazah/:id/verify
 * @desc    Quick verification check for ijazah certificate
 * @access  Public (no authentication required)
 */
router.get(
  "/:id/verify",
  validate(validateIdParam),
  ijazahController.verifyIjazah.bind(ijazahController)
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

/**
 * @route   GET /api/ijazah/statuses
 * @desc    Get available status options
 * @access  All authenticated users
 */
router.get(
  "/statuses",
  authenticate,
  requireFabricToken,
  ijazahController.getAvailableStatuses.bind(ijazahController)
);

/**
 * @route   GET /api/ijazah/status/:status
 * @desc    Get ijazah certificates by status
 * @access  All authenticated users
 */
router.get(
  "/status/:status",
  authenticate,
  requireFabricToken,
  ijazahController.getIjazahByStatus.bind(ijazahController)
);

/**
 * @route   GET /api/ijazah/:id/certificate
 * @desc    Get download URL for certificate PDF
 * @access  All authenticated users
 */
router.get(
  "/:id/certificate",
  authenticate,
  requireFabricToken,
  validate(validateIdParam),
  ijazahController.getCertificateDownloadUrl.bind(ijazahController)
);

/**
 * @route   GET /api/ijazah/:id/photo
 * @desc    Get download URL for student photo
 * @access  All authenticated users
 */
router.get(
  "/:id/photo",
  authenticate,
  requireFabricToken,
  validate(validateIdParam),
  ijazahController.getPhotoDownloadUrl.bind(ijazahController)
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

// ===== REKTOR & AKADEMIK ROUTES =====

/**
 * @route   GET /api/ijazah/pending
 * @desc    Get pending ijazah certificates awaiting rector approval
 * @access  REKTOR & AKADEMIK
 */
router.get(
  "/pending",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]),
  ijazahController.getPendingIjazah.bind(ijazahController)
);

/**
 * @route   PUT /api/ijazah/:id/approve
 * @desc    Approve ijazah certificate with rector signature
 * @access  REKTOR & AKADEMIK
 */
router.put(
  "/:id/approve",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]),
  validate(validateIdParam),
  ijazahController.approveIjazah.bind(ijazahController)
);

/**
 * @route   PUT /api/ijazah/:id/reject
 * @desc    Reject ijazah certificate
 * @access  REKTOR & AKADEMIK
 */
router.put(
  "/:id/reject",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]),
  validate(validateIdParam),
  validate(validateRejectionReason),
  ijazahController.rejectIjazah.bind(ijazahController)
);

/**
 * @route   PUT /api/ijazah/:id/activate
 * @desc    Activate approved ijazah certificate
 * @access  REKTOR & AKADEMIK
 */
router.put(
  "/:id/activate",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]),
  validate(validateIdParam),
  ijazahController.activateIjazah.bind(ijazahController)
);

/**
 * @route   PUT /api/ijazah/:id/regenerate
 * @desc    Regenerate certificate PDF with current or specified signature
 * @access  REKTOR & AKADEMIK
 */
router.put(
  "/:id/regenerate",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]),
  validate(validateIdParam),
  ijazahController.regenerateCertificate.bind(ijazahController)
);

/**
 * @route   PUT /api/ijazah/:id/status
 * @desc    Update ijazah status
 * @access  REKTOR & AKADEMIK (for approval/rejection), AKADEMIK for other status changes
 */
router.put(
  "/:id/status",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]), // Only REKTOR can change status as per fabricService
  validate(validateIdParam),
  validate(validateStatusUpdate),
  ijazahController.updateIjazahStatus.bind(ijazahController)
);

/**
 * @route   POST /api/ijazah/bulk-approve
 * @desc    Bulk approve multiple ijazah certificates
 * @access  REKTOR & AKADEMIK
 */
router.post(
  "/bulk-approve",
  authenticate,
  requireFabricToken,
  requireOrganization([Organization.AKADEMIK, Organization.REKTOR]),
  validate(validateBulkIds),
  ijazahController.bulkApproveIjazah.bind(ijazahController)
);

export default router;
