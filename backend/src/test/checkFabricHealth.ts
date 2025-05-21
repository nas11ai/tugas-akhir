import { checkFabricHealth } from "../config/fabric";
import { logger } from "../utils/logger";

// Panggil fungsi health check
checkFabricHealth().then((isHealthy) => {
  if (isHealthy) {
    logger.info("✅ Fabric REST endpoints are healthy.");
    process.exit(0);
  } else {
    logger.error("❌ Fabric REST endpoints are NOT healthy.");
    process.exit(1);
  }
});
