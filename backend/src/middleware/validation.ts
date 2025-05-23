import { Request, Response, NextFunction } from "express";
import {
  ValidationChain,
  validationResult,
  param,
  body,
} from "express-validator";

/**
 * Middleware to handle validation results
 */
export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({
        success: false,
        message: "Validation error",
        errors: errors.array(),
      });
      return;
    }

    next();
  };
};

/**
 * Validate ID parameter
 */
export const validateIdParam = [
  param("id")
    .notEmpty()
    .withMessage("ID parameter is required")
    .isLength({ min: 1, max: 128 })
    .withMessage("ID must be between 1 and 128 characters"),
];

/**
 * Validate UID parameter
 */
export const validateUidParam = [
  param("uid")
    .notEmpty()
    .withMessage("UID parameter is required")
    .isLength({ min: 1, max: 128 })
    .withMessage("UID must be between 1 and 128 characters"),
];

/**
 * Validation rules for creating ijazah
 */
export const validateCreateIjazah = [
  body("nomorDokumen")
    .notEmpty()
    .withMessage("Nomor dokumen is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Nomor dokumen must be between 1 and 100 characters"),

  body("nomorIjazahNasional")
    .notEmpty()
    .withMessage("Nomor ijazah nasional is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Nomor ijazah nasional must be between 1 and 100 characters"),

  body("nama")
    .notEmpty()
    .withMessage("Nama is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Nama must be between 1 and 200 characters"),

  body("tempatLahir")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Tempat lahir must not exceed 100 characters"),

  body("tanggalLahir")
    .notEmpty()
    .withMessage("Tanggal lahir is required")
    .isISO8601()
    .withMessage("Tanggal lahir must be a valid date"),

  body("nomorIndukKependudukan")
    .optional()
    .isLength({ min: 16, max: 16 })
    .withMessage("NIK must be exactly 16 characters")
    .isNumeric()
    .withMessage("NIK must contain only numbers"),

  body("programStudi")
    .notEmpty()
    .withMessage("Program studi is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Program studi must be between 1 and 200 characters"),

  body("fakultas")
    .notEmpty()
    .withMessage("Fakultas is required")
    .isLength({ min: 1, max: 200 })
    .withMessage("Fakultas must be between 1 and 200 characters"),

  body("tahunDiterima")
    .notEmpty()
    .withMessage("Tahun diterima is required")
    .isLength({ min: 4, max: 4 })
    .withMessage("Tahun diterima must be 4 characters")
    .isNumeric()
    .withMessage("Tahun diterima must be a number"),

  body("nomorIndukMahasiswa")
    .notEmpty()
    .withMessage("NIM is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("NIM must be between 1 and 50 characters"),

  body("tanggalLulus")
    .notEmpty()
    .withMessage("Tanggal lulus is required")
    .isISO8601()
    .withMessage("Tanggal lulus must be a valid date"),

  body("jenisPendidikan")
    .notEmpty()
    .withMessage("Jenis pendidikan is required")
    .isIn(["D3", "D4", "S1", "S2", "S3"])
    .withMessage("Jenis pendidikan must be one of: D3, D4, S1, S2, S3"),

  body("gelarPendidikan")
    .notEmpty()
    .withMessage("Gelar pendidikan is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Gelar pendidikan must be between 1 and 50 characters"),

  body("akreditasiProgramStudi")
    .optional()
    .isIn(["A", "B", "C", "Baik Sekali", "Baik", "Unggul"])
    .withMessage(
      "Akreditasi must be one of: A, B, C, Baik Sekali, Baik, Unggul"
    ),

  body("keputusanAkreditasiProgramStudi")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Keputusan akreditasi must not exceed 200 characters"),

  body("tempatIjazahDiberikan")
    .notEmpty()
    .withMessage("Tempat ijazah diberikan is required")
    .isLength({ min: 1, max: 100 })
    .withMessage(
      "Tempat ijazah diberikan must be between 1 and 100 characters"
    ),

  body("tanggalIjazahDiberikan")
    .notEmpty()
    .withMessage("Tanggal ijazah diberikan is required")
    .isISO8601()
    .withMessage("Tanggal ijazah diberikan must be a valid date"),
];

/**
 * Validation rules for updating ijazah
 */
export const validateUpdateIjazah = [
  body("nomorDokumen")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Nomor dokumen must be between 1 and 100 characters"),

  body("nomorIjazahNasional")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Nomor ijazah nasional must be between 1 and 100 characters"),

  body("nama")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Nama must be between 1 and 200 characters"),

  body("tempatLahir")
    .optional()
    .isLength({ max: 100 })
    .withMessage("Tempat lahir must not exceed 100 characters"),

  body("tanggalLahir")
    .optional()
    .isISO8601()
    .withMessage("Tanggal lahir must be a valid date"),

  body("nomorIndukKependudukan")
    .optional()
    .isLength({ min: 16, max: 16 })
    .withMessage("NIK must be exactly 16 characters")
    .isNumeric()
    .withMessage("NIK must contain only numbers"),

  body("programStudi")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Program studi must be between 1 and 200 characters"),

  body("fakultas")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage("Fakultas must be between 1 and 200 characters"),

  body("tahunDiterima")
    .optional()
    .isLength({ min: 4, max: 4 })
    .withMessage("Tahun diterima must be 4 characters")
    .isNumeric()
    .withMessage("Tahun diterima must be a number"),

  body("nomorIndukMahasiswa")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("NIM must be between 1 and 50 characters"),

  body("tanggalLulus")
    .optional()
    .isISO8601()
    .withMessage("Tanggal lulus must be a valid date"),

  body("jenisPendidikan")
    .optional()
    .isIn(["D3", "D4", "S1", "S2", "S3"])
    .withMessage("Jenis pendidikan must be one of: D3, D4, S1, S2, S3"),

  body("gelarPendidikan")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Gelar pendidikan must be between 1 and 50 characters"),

  body("akreditasiProgramStudi")
    .optional()
    .isIn(["A", "B", "C", "Baik Sekali", "Baik", "Unggul"])
    .withMessage(
      "Akreditasi must be one of: A, B, C, Baik Sekali, Baik, Unggul"
    ),

  body("keputusanAkreditasiProgramStudi")
    .optional()
    .isLength({ max: 200 })
    .withMessage("Keputusan akreditasi must not exceed 200 characters"),

  body("tempatIjazahDiberikan")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage(
      "Tempat ijazah diberikan must be between 1 and 100 characters"
    ),

  body("tanggalIjazahDiberikan")
    .optional()
    .isISO8601()
    .withMessage("Tanggal ijazah diberikan must be a valid date"),
];

/**
 * Validation rules for creating signature
 */
export const validateCreateSignature = [
  body("ID")
    .notEmpty()
    .withMessage("Signature ID is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Signature ID must be between 1 and 100 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Signature ID can only contain letters, numbers, hyphens, and underscores"
    ),

  body("URL")
    .notEmpty()
    .withMessage("Signature URL is required")
    .isURL()
    .withMessage("Signature URL must be a valid URL"),

  body("IsActive")
    .optional()
    .isBoolean()
    .withMessage("IsActive must be a boolean value"),
];

/**
 * Validation rules for updating signature
 */
export const validateUpdateSignature = [
  body("URL")
    .optional()
    .isURL()
    .withMessage("Signature URL must be a valid URL"),

  body("IsActive")
    .optional()
    .isBoolean()
    .withMessage("IsActive must be a boolean value"),
];

/**
 * Validation rules for status update
 */
export const validateStatusUpdate = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn([
      "menunggu tanda tangan rektor",
      "disetujui rektor",
      "ditolak rektor",
      "aktif",
      "dicabut",
    ])
    .withMessage("Invalid status value"),
];

/**
 * Validation rules for bulk operations
 */
export const validateBulkIds = [
  body("ijazahIds")
    .isArray({ min: 1 })
    .withMessage("ijazahIds must be a non-empty array"),

  body("ijazahIds.*")
    .notEmpty()
    .withMessage("Each ijazah ID must not be empty")
    .isLength({ min: 1, max: 128 })
    .withMessage("Each ijazah ID must be between 1 and 128 characters"),
];

/**
 * Validation rules for rejection reason
 */
export const validateRejectionReason = [
  body("rejectionReason")
    .optional()
    .isLength({ min: 1, max: 500 })
    .withMessage("Rejection reason must be between 1 and 500 characters"),
];

/**
 * Validation rules for URL validation
 */
export const validateUrl = [
  body("url")
    .notEmpty()
    .withMessage("URL is required")
    .isURL()
    .withMessage("Must be a valid URL"),
];

// Validation rules for user creation
export const validateCreateUser = [
  body("uid")
    .notEmpty()
    .withMessage("UID is required")
    .isLength({ min: 1, max: 128 })
    .withMessage("UID must be between 1 and 128 characters"),

  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("displayName")
    .notEmpty()
    .withMessage("Display name is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Display name must be between 1 and 100 characters"),

  body("photoURL")
    .optional()
    .isURL()
    .withMessage("Photo URL must be a valid URL"),

  body("role")
    .isIn(["user", "admin", "akademik", "rektor"])
    .withMessage("Role must be one of: user, admin, akademik, rektor"),

  body("organization")
    .isIn(["AKADEMIK", "REKTOR"])
    .withMessage("Organization must be one of: AKADEMIK, REKTOR"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
];

// Validation rules for user update
export const validateUpdateUser = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),

  body("displayName")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Display name must be between 1 and 100 characters"),

  body("photoURL")
    .optional()
    .isURL()
    .withMessage("Photo URL must be a valid URL"),

  body("role")
    .optional()
    .isIn(["user", "admin", "akademik", "rektor"])
    .withMessage("Role must be one of: user, admin, akademik, rektor"),

  body("organization")
    .optional()
    .isIn(["AKADEMIK", "REKTOR"])
    .withMessage("Organization must be one of: AKADEMIK, REKTOR"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean value"),
];

// Validation rules for user credentials
export const validateUserCredentials = [
  body("username")
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 50 })
    .withMessage("Username must be between 3 and 50 characters")
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Username can only contain letters, numbers, hyphens, and underscores"
    ),

  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    ),
];

// Validation for organization parameter
export const validateOrganizationParam = [
  param("organization")
    .isIn(["AKADEMIK", "REKTOR"])
    .withMessage("Organization must be one of: AKADEMIK, REKTOR"),
];
