import { TestDataGenerator } from "./testDataGenerator";
import { TestAuthHelper } from "./testAuthHelper";
import { MockAPIResponses } from "./mockApiResponses";
import { TestContainerManager } from "./testContainerManager";

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const retry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await delay(delayMs);
      }
    }
  }

  throw lastError!;
};

export {
  TestDataGenerator,
  TestAuthHelper,
  MockAPIResponses,
  TestContainerManager,
  retry,
  delay,
};
