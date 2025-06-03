import { Router } from "express";
import ijazahRoutes from "./ijazahRoutes";
import signatureRoutes from "./signatureRoutes";
import userRoutes from "./userRoutes";
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
        "GET /api/ijazah/:id/validate": "Validate ijazah certificate (Public)",
        "GET /api/ijazah/:id/verify": "Quick verification check (Public)",
        "GET /api/health": "Service health check",
        "GET /api/info": "API information",
      },
      ijazah: {
        "GET /api/ijazah/nim/:nim": "Get mahasiswa by NIM (AKADEMIK only)",
        "POST /api/ijazah": "Create new ijazah certificate (AKADEMIK only)",
        "PUT /api/ijazah/:id": "Update ijazah certificate (AKADEMIK only)",
        "GET /api/ijazah": "Get all ijazah certificates (Authenticated)",
        "GET /api/ijazah/pending":
          "Get pending certificates awaiting approval (REKTOR only)",
        "GET /api/ijazah/status/:status":
          "Get ijazah certificates by status (Authenticated)",
        "PUT /api/ijazah/:id/status":
          "Update ijazah status (REKTOR for approval)",
        "PUT /api/ijazah/:id/approve":
          "Approve certificate with signature (REKTOR only)",
        "PUT /api/ijazah/:id/reject": "Reject certificate (REKTOR only)",
        "PUT /api/ijazah/:id/activate":
          "Activate approved certificate (REKTOR only)",
        "PUT /api/ijazah/:id/regenerate":
          "Regenerate certificate with signature (REKTOR only)",
        "POST /api/ijazah/bulk-approve":
          "Bulk approve multiple certificates (REKTOR only)",
        "DELETE /api/ijazah/:id": "Delete ijazah certificate (AKADEMIK only)",
        "GET /api/ijazah/:id/certificate":
          "Get certificate download URL (Authenticated)",
        "GET /api/ijazah/:id/photo": "Get photo download URL (Authenticated)",
        "GET /api/ijazah/statuses":
          "Get available status options (Authenticated)",
      },
      signature: {
        "POST /api/signature": "Create new signature (REKTOR only)",
        "POST /api/signature/upload": "Upload signature file (REKTOR only)",
        "PUT /api/signature/:id": "Update signature (REKTOR only)",
        "GET /api/signature/:id": "Get signature by ID (Authenticated)",
        "GET /api/signature": "Get all signatures (Authenticated)",
        "GET /api/signature/active": "Get active signature (Authenticated)",
        "PUT /api/signature/:id/activate":
          "Set signature as active (REKTOR only)",
        "PUT /api/signature/:id/deactivate":
          "Deactivate signature (REKTOR only)",
        "DELETE /api/signature/:id": "Delete signature (REKTOR only)",
        "GET /api/signature/stats": "Get signature statistics (REKTOR only)",
        "POST /api/signature/validate-url":
          "Validate signature URL (REKTOR only)",
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
      AKADEMIK: "Can create, update, and delete ijazah certificates",
      REKTOR: "Can manage signatures and approve/reject ijazah certificates",
      PUBLIC: "Can validate and verify ijazah certificates",
    },
    validation: {
      description: "Public certificate validation system",
      usage: [
        "GET /api/ijazah/{certificate-id} - Full certificate details with validation info",
        "GET /api/ijazah/{certificate-id}/validate - Detailed validation with limited public info",
        "GET /api/ijazah/{certificate-id}/verify - Quick verification check",
      ],
    },
  });
});

// Mount route modules
router.use("/ijazah", ijazahRoutes);
router.use("/signature", signatureRoutes);
router.use("/user", userRoutes);

export default router;
