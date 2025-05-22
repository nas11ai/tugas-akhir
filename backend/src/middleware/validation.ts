import { body } from "express-validator";

/**
 * Validation rules for creating ijazah certificate
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
    .withMessage("Tanggal lahir must be a valid ISO date"),

  body("nomorIndukKependudukan")
    .notEmpty()
    .withMessage("Nomor induk kependudukan is required")
    .isLength({ min: 16, max: 16 })
    .withMessage("Nomor induk kependudukan must be exactly 16 characters")
    .isNumeric()
    .withMessage("Nomor induk kependudukan must contain only numbers"),

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
    .withMessage("Tahun diterima must be exactly 4 characters")
    .isNumeric()
    .withMessage("Tahun diterima must be a valid year"),

  body("nomorIndukMahasiswa")
    .notEmpty()
    .withMessage("Nomor induk mahasiswa is required")
    .isLength({ min: 1, max: 50 })
    .withMessage("Nomor induk mahasiswa must be between 1 and 50 characters"),

  body("tanggalLulus")
    .notEmpty()
    .withMessage("Tanggal lulus is required")
    .isISO8601()
    .withMessage("Tanggal lulus must be a valid ISO date"),

  body("jenisPendidikan")
    .notEmpty()
    .withMessage("Jenis pendidikan is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Jenis pendidikan must be between 1 and 100 characters"),

  body("gelarPendidikan")
    .notEmpty()
    .withMessage("Gelar pendidikan is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Gelar pendidikan must be between 1 and 100 characters"),

  body("akreditasiProgramStudi")
    .notEmpty()
    .withMessage("Akreditasi program studi is required")
    .isIn(["A", "B", "C", "Unggul", "Baik Sekali", "Baik"])
    .withMessage(
      "Akreditasi program studi must be one of: A, B, C, Unggul, Baik Sekali, Baik"
    ),

  body("keputusanAkreditasiProgramStudi")
    .notEmpty()
    .withMessage("Keputusan akreditasi program studi is required")
    .isLength({ min: 1, max: 200 })
    .withMessage(
      "Keputusan akreditasi program studi must be between 1 and 200 characters"
    ),

  body("tempatIjazahDiberikan")
    .notEmpty()
    .withMessage("Tempat ijazah diberikan is required")
    .isLength({ min: 1, max: 200 })
    .withMessage(
      "Tempat ijazah diberikan must be between 1 and 200 characters"
    ),

  body("tanggalIjazahDiberikan")
    .notEmpty()
    .withMessage("Tanggal ijazah diberikan is required")
    .isISO8601()
    .withMessage("Tanggal ijazah diberikan must be a valid ISO date"),

  body("ipfsCID")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("IPFS CID must be between 1 and 100 characters"),

  body("signatureID")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Signature ID must be between 1 and 100 characters"),

  body("photoCID")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Photo CID must be between 1 and 100 characters"),

  body("Status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE", "REVOKED"])
    .withMessage("Status must be one of: ACTIVE, INACTIVE, REVOKED"),
];

/**
 * Validation rules for updating ijazah certificate
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
    .withMessage("Tanggal lahir must be a valid ISO date"),

  body("nomorIndukKependudukan")
    .optional()
    .isLength({ min: 16, max: 16 })
    .withMessage("Nomor induk kependudukan must be exactly 16 characters")
    .isNumeric()
    .withMessage("Nomor induk kependudukan must contain only numbers"),

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
    .withMessage("Tahun diterima must be exactly 4 characters")
    .isNumeric()
    .withMessage("Tahun diterima must be a valid year"),

  body("nomorIndukMahasiswa")
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage("Nomor induk mahasiswa must be between 1 and 50 characters"),

  body("tanggalLulus")
    .optional()
    .isISO8601()
    .withMessage("Tanggal lulus must be a valid ISO date"),

  body("jenisPendidikan")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Jenis pendidikan must be between 1 and 100 characters"),

  body("gelarPendidikan")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Gelar pendidikan must be between 1 and 100 characters"),

  body("akreditasiProgramStudi")
    .optional()
    .isIn(["A", "B", "C", "Unggul", "Baik Sekali", "Baik"])
    .withMessage(
      "Akreditasi program studi must be one of: A, B, C, Unggul, Baik Sekali, Baik"
    ),

  body("keputusanAkreditasiProgramStudi")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage(
      "Keputusan akreditasi program studi must be between 1 and 200 characters"
    ),

  body("tempatIjazahDiberikan")
    .optional()
    .isLength({ min: 1, max: 200 })
    .withMessage(
      "Tempat ijazah diberikan must be between 1 and 200 characters"
    ),

  body("tanggalIjazahDiberikan")
    .optional()
    .isISO8601()
    .withMessage("Tanggal ijazah diberikan must be a valid ISO date"),

  body("ipfsCID")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("IPFS CID must be between 1 and 100 characters"),

  body("signatureID")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Signature ID must be between 1 and 100 characters"),

  body("photoCID")
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage("Photo CID must be between 1 and 100 characters"),

  body("Status")
    .optional()
    .isIn(["ACTIVE", "INACTIVE", "REVOKED"])
    .withMessage("Status must be one of: ACTIVE, INACTIVE, REVOKED"),
];

/**
 * Validation rules for creating signature
 */
export const validateCreateSignature = [
  body("ID")
    .notEmpty()
    .withMessage("Signature ID is required")
    .isLength({ min: 1, max: 100 })
    .withMessage("Signature ID must be between 1 and 100 characters"),

  body("URL")
    .notEmpty()
    .withMessage("Signature URL is required")
    .isURL()
    .withMessage("URL must be a valid URL"),

  body("IsActive")
    .optional()
    .isBoolean()
    .withMessage("IsActive must be a boolean value"),
];

/**
 * Validation rules for updating signature
 */
export const validateUpdateSignature = [
  body("URL").optional().isURL().withMessage("URL must be a valid URL"),

  body("IsActive")
    .optional()
    .isBoolean()
    .withMessage("IsActive must be a boolean value"),
];
import { Request, Response, NextFunction } from "express";
import { validationResult, ValidationChain } from "express-validator";
import { AppError } from "./error";

/**
 * Middleware to validate request data using express-validator
 * @param validations Array of validation chains
 * @returns Middleware function
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Execute all validations
    await Promise.all(validations.map((validation) => validation.run(req)));

    // Get validation errors
    const errors = validationResult(req);

    // If no errors, continue
    if (errors.isEmpty()) {
      return next();
    }

    // Format errors for better readability
    const extractedErrors: { [key: string]: string } = {};
    errors.array().forEach((err) => {
      if (err.type === "field" && err.path && err.msg) {
        extractedErrors[err.path] = err.msg;
      }
    });

    // Return error response
    return res.status(400).json({
      success: false,
      message: "Validation error",
      errors: extractedErrors,
    });
  };
};

/**
 * Middleware to validate request ID parameter
 */
export const validateIdParam = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  if (!id || id.trim() === "") {
    return next(new AppError("ID parameter is required", 400));
  }

  next();
};
