import winston from "winston";

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${message} ${stack || ""}`;
  })
);

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  transports: [
    // Log to console
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),
    // Log errors to file
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
    }),
    // Log all to file
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
  ],
});

// Add stream for Morgan middleware
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};
