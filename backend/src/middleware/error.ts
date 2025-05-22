import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

/**
 * Custom error class with status code
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle 404 Not Found
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new AppError(
    `Cannot find ${req.originalUrl} on this server`,
    404
  );
  next(error);
};

/**
 * Global error handler
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log the error
  logger.error(`Error: ${err.message}`, { stack: err.stack });

  // If it's our custom error with status code
  if ("statusCode" in err && "isOperational" in err) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }

  // If it's a Multer error
  if (err.name === "MulterError") {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
  }

  // If it's a validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // For Firebase auth errors
  if (err.name === "FirebaseAuthError") {
    return res.status(401).json({
      success: false,
      message: "Authentication error: " + err.message,
    });
  }

  // Default to 500 server error
  return res.status(500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
