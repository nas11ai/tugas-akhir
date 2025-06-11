'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class CreateSignatureWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.workerIndex = -1;
    this.totalWorkers = -1;
    this.roundIndex = -1;
    this.roundArguments = undefined;
    this.sutAdapter = undefined;
    this.sutContext = undefined;

    this.txIndex = 0;
    this.startTime = Date.now();

    this.txIndex = 0;

    // Track created signatures for cleanup
    this.createdSignatures = [];
    this.cleanupEnabled = true; // Flag to enable/disable cleanup
  }

  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    this.workerIndex = workerIndex;
    this.totalWorkers = totalWorkers;
    this.roundIndex = roundIndex;
    this.roundArguments = roundArguments;
    this.sutAdapter = sutAdapter;
    this.sutContext = sutContext;

    this.txIndex = 0;
    this.startTime = Date.now();

    // Reset tracking arrays for new round
    this.createdSignatures = [];

    // Check if cleanup is enabled from round arguments
    if (this.roundArguments && typeof this.roundArguments.cleanup !== 'undefined') {
      this.cleanupEnabled = this.roundArguments.cleanup;
    }

    console.log(`Worker ${this.workerIndex}: Initialized with cleanup ${this.cleanupEnabled ? 'enabled' : 'disabled'}`);
  }

  async submitTransaction() {
    this.txIndex++;
    const signatureId = `SIG_${this.workerIndex}_${this.roundIndex}_${this.txIndex}_${Date.now()}`;

    const signatureData = {
      ID: signatureId,
      CID: `Qm${Math.random().toString(36).substring(2, 15)}abcdef1234567890`,
      IsActive: false,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'CreateSignature',
      contractArguments: [JSON.stringify(signatureData)],
      readOnly: false
    };

    try {
      await this.sutAdapter.sendRequests(request);

      // Track successfully created signature for cleanup
      if (this.cleanupEnabled) {
        this.createdSignatures.push(signatureId);
      }

    } catch (error) {
      console.error(`Failed to submit transaction for signature ID: ${signatureId}`, error.message);
      throw error;
    }
  }

  async cleanupWorkloadModule() {
    if (!this.cleanupEnabled || this.createdSignatures.length === 0) {
      console.log(`Worker ${this.workerIndex}: No cleanup needed or cleanup disabled`);
      return;
    }

    console.log(`Worker ${this.workerIndex}: Starting cleanup of ${this.createdSignatures.length} signatures...`);

    let cleanupSuccessCount = 0;
    let cleanupFailCount = 0;

    // Cleanup in batches to avoid overwhelming the network
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < this.createdSignatures.length; i += batchSize) {
      batches.push(this.createdSignatures.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const cleanupPromises = batch.map(async (signatureId) => {
        try {
          // Assuming your chaincode has a DeleteSignature function
          // Adjust the function name according to your actual chaincode
          const deleteRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'DeleteSignature',
            contractArguments: [signatureId],
            readOnly: false
          };

          await this.sutAdapter.sendRequests(deleteRequest);
          cleanupSuccessCount++;

        } catch (error) {
          console.error(`Worker ${this.workerIndex}: Failed to cleanup signature ${signatureId}:`, error.message);
          cleanupFailCount++;

          // Try alternative cleanup method (set IsActive to false)
          try {
            const updateRequest = {
              contractId: 'ijazah-chaincode',
              contractFunction: 'UpdateSignatureStatus',
              contractArguments: [signatureId, 'false'],
              readOnly: false
            };

            await this.sutAdapter.sendRequests(updateRequest);
            console.log(`Worker ${this.workerIndex}: Successfully deactivated signature ${signatureId}`);
            cleanupSuccessCount++;
            cleanupFailCount--; // Adjust count since we succeeded with alternative method

          } catch (alternativeError) {
            console.error(`Worker ${this.workerIndex}: Alternative cleanup also failed for ${signatureId}:`, alternativeError.message);
          }
        }
      });

      // Wait for current batch to complete before proceeding to next batch
      await Promise.allSettled(cleanupPromises);

      // Small delay to prevent overwhelming the network
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    console.log(`Worker ${this.workerIndex}: Cleanup completed. Success: ${cleanupSuccessCount}, Failed: ${cleanupFailCount}`);

    // Reset the tracking array
    this.createdSignatures = [];
  }

  // Optional: Method to manually trigger cleanup during testing
  async manualCleanup() {
    await this.cleanupWorkloadModule();
  }

  // Optional: Get cleanup statistics
  getCleanupStats() {
    return {
      workerIndex: this.workerIndex,
      trackedSignatures: this.createdSignatures.length,
      cleanupEnabled: this.cleanupEnabled
    };
  }
}

function createWorkloadModule() {
  return new CreateSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;