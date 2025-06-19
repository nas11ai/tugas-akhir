import axios from "axios";
import { logger } from "../utils/logger";
import dotenv from "dotenv";

dotenv.config();

// Fabric organization configuration
export const fabricOrgs = {
  AKADEMIK: {
    restEndpoint: process.env.AKADEMIK_REST_ENDPOINT || "http://localhost:8801",
    mspId: process.env.AKADEMIK_MSP_ID || "AkademikMSP",
  },
  REKTOR: {
    restEndpoint: process.env.REKTOR_REST_ENDPOINT || "http://localhost:8802",
    mspId: process.env.REKTOR_MSP_ID || "RektorMSP",
  },
};

// Fabric chaincode configuration
export const chaincode = {
  name: process.env.CHAINCODE_NAME || "mycontract",
  channel: process.env.FABRIC_CHANNEL || "mychannel",
};

export const IJAZAH_STATUS = {
  AKTIF: "aktif",
  NONAKTIF: "nonaktif",
};

export const akademikClient = axios.create({
  baseURL: fabricOrgs.AKADEMIK.restEndpoint,
  headers: {
    "Content-Type": "application/json",
  },
});

export const rektorClient = axios.create({
  baseURL: fabricOrgs.REKTOR.restEndpoint,
  headers: {
    "Content-Type": "application/json",
  },
});

export const setFabricAuthHeader = (client: any, token: string) => {
  client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
};

export const checkFabricHealth = async (): Promise<boolean> => {
  try {
    const payload = {
      id: process.env.ADMIN_USERNAME,
      secret: process.env.ADMIN_PASSWORD,
    };

    const akademikPromise = akademikClient.post("/user/enroll", payload);
    const rektorPromise = rektorClient.post("/user/enroll", payload);

    const [akademikHealth, rektorHealth] = await Promise.allSettled([
      akademikPromise,
      rektorPromise,
    ]);

    const akademikHealthy =
      akademikHealth.status === "fulfilled" &&
      akademikHealth.value?.data?.token;

    const rektorHealthy =
      rektorHealth.status === "fulfilled" && rektorHealth.value?.data?.token;

    if (akademikHealthy || rektorHealthy) {
      logger.info("Fabric REST endpoints returned valid token.");

      if (!akademikHealthy) {
        logger.warn("Akademik REST endpoint did not return token.");
      }

      if (!rektorHealthy) {
        logger.warn("Rektor REST endpoint did not return token.");
      }

      return true;
    } else {
      const akademikError =
        akademikHealth.status === "rejected"
          ? akademikHealth.reason
          : "No token";
      const rektorError =
        rektorHealth.status === "rejected" ? rektorHealth.reason : "No token";

      logger.warn(
        `Fabric REST endpoints failed. Akademik: ${akademikError}, Rektor: ${rektorError}`
      );
      return false;
    }
  } catch (error) {
    logger.error("Unexpected error during health check:", error);
    return false;
  }
};
