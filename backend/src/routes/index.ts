import { Router } from "express";
import ijazahRoutes from "./ijazahRoutes";
import signatureRoutes from "./signatureRoutes";
import userRoutes from "./userRoutes";
import fileRoutes from "./fileRoutes";
import { fabricService } from "../services/fabricService";

const router = Router();

// Health check endpoint
router.get("/health", async (req, res) => {
  try {
    const health = await fabricService.healthCheck();

    res.status(health.overall ? 200 : 503).json({
      success: health.overall,
      message: health.overall
        ? "All services are healthy"
        : "Some services are unhealthy",
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Health check failed",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// API Info endpoint
router.get("/info", (req, res) => {
  res.json({
    success: true,
    message: "Ijazah Certificate Management API",
    version: "1.0.0",
    endpoints: {
      public: {
        "GET /api/ijazah/:id":
          "Get ijazah certificate by ID (Public access for validation)",
        "GET /api/health": "Service health check",
        "GET /api/info": "API information",
      },
      ijazah: {
        "GET /api/ijazah/nim/:nim": "Get mahasiswa by NIM (AKADEMIK only)",
        "POST /api/ijazah": "Create new ijazah certificate (AKADEMIK only)",
        "PUT /api/ijazah/:id": "Update ijazah certificate (AKADEMIK only)",
        "GET /api/ijazah": "Get all ijazah certificates (Authenticated)",
        "DELETE /api/ijazah/:id": "Delete ijazah certificate (AKADEMIK only)",
      },
      signature: {
        "POST /api/signature": "Create new signature (AKADEMIK only)",
        "POST /api/signature/upload": "Upload signature file (AKADEMIK only)",
        "PUT /api/signature/:id": "Update signature (AKADEMIK only)",
        "GET /api/signature/:id": "Get signature by ID (Authenticated)",
        "GET /api/signature": "Get all signatures (Authenticated)",
        "GET /api/signature/active": "Get active signature (Authenticated)",
        "PUT /api/signature/:id/activate":
          "Set signature as active (AKADEMIK only)",
        "PUT /api/signature/:id/deactivate":
          "Deactivate signature (AKADEMIK only)",
        "DELETE /api/signature/:id": "Delete signature (AKADEMIK only)",
        "GET /api/signature/stats": "Get signature statistics (AKADEMIK only)",
      },
      user: {
        "POST /api/user": "Create new user",
        "GET /api/user/me": "Get current user",
        "GET /api/user": "Get all users",
        "GET /api/user/:id": "Get user by ID",
        "PUT /api/user/:id": "Update user",
        "POST /api/user/:id/credentials": "Set user credentials",
        "DELETE /api/user/:id/credentials": "Delete user credentials",
        "GET /api/user/organization/:organization": "Get users by organization",
        "GET /api/user/active": "Get active users",
        "PUT /api/user/:id/activate": "Activate user",
        "PUT /api/user/:id/deactivate": "Deactivate user",
      },
    },
    authentication: {
      required:
        "Most endpoints require Firebase JWT token in Authorization header",
      public: "Certificate validation endpoints are publicly accessible",
      format: "Authorization: Bearer <firebase-jwt-token>",
    },
    organizations: {
      AKADEMIK:
        "Can create, update, and delete ijazah certificates and signatures",
      PUBLIC: "Can validate and verify ijazah certificates",
    },
    validation: {
      description: "Public certificate validation system",
      usage: [
        "GET /api/ijazah/{certificate-id} - Full certificate details with validation info",
      ],
    },
  });
});

// Mount route modules
router.use("/ijazah", ijazahRoutes);
router.use("/signature", signatureRoutes);
router.use("/user", userRoutes);

// File serving routes (for photos and signatures)
router.use("/files", fileRoutes);

export default router;
