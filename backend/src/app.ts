import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import dotenv from "dotenv";
import apiRoutes from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { logger } from "./utils/logger";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined"));
}

// Root endpoint
app.get("/", (req, res) => {
  res.json({
    message: "Ijazah Certificate Management API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      ijazah: "/api/ijazah",
      signature: "/api/signature",
      users: "/api/users",
    },
  });
});

// API routes
app.use("/api", apiRoutes);

app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.info(`🌐 API Base URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("👋 SIGTERM received. Shutting down gracefully...");
  server.close(() => {
    logger.info("✅ Process terminated");
  });
});

process.on("SIGINT", () => {
  logger.info("👋 SIGINT received. Shutting down gracefully...");
  server.close(() => {
    logger.info("✅ Process terminated");
  });
});

export default app;
