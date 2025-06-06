import { checkIpfsClusterHealth } from "../configs/ipfsCluster";
import { logger } from "../utils/logger";

// Panggil fungsi health check
checkIpfsClusterHealth().then((isHealthy) => {
  if (isHealthy) {
    logger.info("✅ Ipfs REST endpoints are healthy.");
    process.exit(0);
  } else {
    logger.error("❌ Ipfs REST endpoints are NOT healthy.");
    process.exit(1);
  }
});
