'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

class UpdateSignatureWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.workerIndex = -1;
    this.totalWorkers = -1;
    this.roundIndex = -1;
    this.roundArguments = undefined;
    this.sutAdapter = undefined;
    this.sutContext = undefined;

    this.txIndex = 0;
    this.setupCompleted = false;

    // Track created signatures for cleanup
    this.createdSignatures = [];
    this.cleanupEnabled = true;

    // Configuration for signature generation
    this.signatureCount = 10; // Number of signatures to create for updating
  }

  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    this.workerIndex = workerIndex;
    this.totalWorkers = totalWorkers;
    this.roundIndex = roundIndex;
    this.roundArguments = roundArguments;
    this.sutAdapter = sutAdapter;
    this.sutContext = sutContext;

    this.txIndex = 0;
    this.setupCompleted = false;
    this.createdSignatures = [];

    // Get configuration from round arguments
    if (this.roundArguments) {
      this.signatureCount = this.roundArguments.signatureCount || 10;
      this.cleanupEnabled = this.roundArguments.cleanup !== false; // Default true
    }

    console.log(`Worker ${this.workerIndex}: Initialized with ${this.signatureCount} signatures to create for update testing`);

    // Setup signatures before testing
    await this.setupSignatures();
  }

  async setupSignatures() {
    if (this.setupCompleted) {
      return;
    }

    console.log(`Worker ${this.workerIndex}: Setting up test signatures for UpdateSignature testing...`);

    try {
      // Create signatures for updating
      for (let i = 1; i <= this.signatureCount; i++) {
        await this.createTestSignature(i);
      }

      this.setupCompleted = true;
      console.log(`Worker ${this.workerIndex}: Setup completed. Created ${this.createdSignatures.length} signatures for UpdateSignature testing`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to setup signatures:`, error.message);
      throw error;
    }
  }

  async createTestSignature(index) {
    const timestamp = Date.now();
    const signatureId = `signature_${this.workerIndex}_${this.roundIndex}_${index}_${timestamp}`;

    const signatureData = {
      ID: signatureId,
      CID: `testing cid`,
      IsActive: true,
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'CreateSignature',
      contractArguments: [JSON.stringify(signatureData)],
      readOnly: false
    };

    try {
      const result = await this.sutAdapter.sendRequests(request);

      // Track created signature for cleanup
      this.createdSignatures.push(signatureId);

      console.log(`Worker ${this.workerIndex}: Created signature for updating: ${signatureId}`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to create signature ${signatureId}:`, error.message);
      console.error(`Worker ${this.workerIndex}: Create signature data:`, JSON.stringify(signatureData, null, 2));
      throw error;
    }
  }

  async submitTransaction() {
    this.txIndex++;

    // Ensure setup is completed before running updates
    if (!this.setupCompleted) {
      await this.setupSignatures();
    }

    if (this.createdSignatures.length === 0) {
      throw new Error(`Worker ${this.workerIndex}: No signatures available for updating`);
    }

    // Select a random signature to update
    const randomIndex = Math.floor(Math.random() * this.createdSignatures.length);
    const signatureId = this.createdSignatures[randomIndex];

    // Generate updated data
    const updatedSignatureData = {
      ID: signatureId,
      CID: `testing cid`,
      IsActive: Math.random() > 0.3,
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'UpdateSignature',
      contractArguments: [JSON.stringify(updatedSignatureData)],
      readOnly: false
    };

    try {
      const result = await this.sutAdapter.sendRequests(request);

      // Optional: Log result for debugging (remove in production)
      if (this.txIndex <= 3) { // Only log first few transactions to avoid spam
        console.log(`Worker ${this.workerIndex}: UpdateSignature transaction ${this.txIndex} completed for signature: ${signatureId}`);
      }

      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to execute UpdateSignature transaction ${this.txIndex} for signature ${signatureId}:`, error.message);
      console.error(`Worker ${this.workerIndex}: Update signature data:`, JSON.stringify(updatedSignatureData, null, 2));
      throw error;
    }
  }

  async cleanupWorkloadModule() {
    if (!this.cleanupEnabled || this.createdSignatures.length === 0) {
      console.log(`Worker ${this.workerIndex}: No cleanup needed or cleanup disabled`);
      return;
    }

    console.log(`Worker ${this.workerIndex}: Starting cleanup of ${this.createdSignatures.length} test signatures...`);

    let cleanupSuccessCount = 0;
    let cleanupFailCount = 0;

    // Cleanup in batches to avoid overwhelming the network
    const batchSize = 5;
    const batches = [];

    for (let i = 0; i < this.createdSignatures.length; i += batchSize) {
      batches.push(this.createdSignatures.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const cleanupPromises = batch.map(async (signatureId) => {
        try {
          // Try to delete the signature
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

          // Try alternative cleanup method (deactivate)
          try {
            const updateRequest = {
              contractId: 'ijazah-chaincode',
              contractFunction: 'UpdateSignatureStatus',
              contractArguments: [signatureId, 'false'],
              readOnly: false
            };

            await this.sutAdapter.sendRequests(updateRequest);
            console.log(`Worker ${this.workerIndex}: Successfully deactivated signature ${signatureId} as cleanup`);
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
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    console.log(`Worker ${this.workerIndex}: Cleanup completed. Success: ${cleanupSuccessCount}, Failed: ${cleanupFailCount}`);

    // Reset the tracking array
    this.createdSignatures = [];
    this.setupCompleted = false;
  }

  // Optional: Method to manually setup signatures during testing
  async manualSetup() {
    this.setupCompleted = false;
    await this.setupSignatures();
  }

  // Optional: Get workload statistics
  getWorkloadStats() {
    return {
      workerIndex: this.workerIndex,
      setupCompleted: this.setupCompleted,
      trackedSignatures: this.createdSignatures.length,
      signatureCount: this.signatureCount,
      cleanupEnabled: this.cleanupEnabled,
      totalUpdates: this.txIndex
    };
  }

  // Optional: Method to verify a signature after update
  async verifyUpdate(signatureId) {
    if (!signatureId && this.createdSignatures.length > 0) {
      signatureId = this.createdSignatures[0];
    }

    if (!signatureId) {
      console.log(`Worker ${this.workerIndex}: No signature ID provided for verification`);
      return null;
    }

    try {
      const request = {
        contractId: 'ijazah-chaincode',
        contractFunction: 'ReadSignature',
        contractArguments: [signatureId],
        readOnly: true
      };

      const result = await this.sutAdapter.sendRequests(request);
      console.log(`Worker ${this.workerIndex}: Successfully verified updated signature: ${signatureId}`);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to verify updated signature ${signatureId}:`, error.message);
      throw error;
    }
  }

  // Optional: Method to get update statistics
  async getUpdateStats() {
    try {
      const ourSignatures = [];

      // Check each of our created signatures
      for (const signatureId of this.createdSignatures) {
        try {
          const request = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'ReadSignature',
            contractArguments: [signatureId],
            readOnly: true
          };

          const result = await this.sutAdapter.sendRequests(request);
          if (result && result.result) {
            const signature = JSON.parse(result.result);
            ourSignatures.push(signature);
          }
        } catch (error) {
          // Skip failed reads
        }
      }

      const stats = {
        totalCreated: this.createdSignatures.length,
        totalUpdates: this.txIndex,
        currentlyActive: ourSignatures.filter(sig => sig.IsActive === true).length,
        currentlyInactive: ourSignatures.filter(sig => sig.IsActive === false).length,
        successfulReads: ourSignatures.length
      };

      return stats;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to get update stats:`, error.message);
      return { error: error.message };
    }
  }

  // Optional: Method to test updating a specific signature
  async testSpecificUpdate(signatureId, updateData) {
    if (!signatureId && this.createdSignatures.length > 0) {
      signatureId = this.createdSignatures[0];
    }

    if (!signatureId) {
      console.log(`Worker ${this.workerIndex}: No signature ID provided for specific update`);
      return null;
    }

    const defaultUpdateData = {
      ID: signatureId,
      CID: `testing cid`,
      IsActive: true,
    };

    const finalUpdateData = { ...defaultUpdateData, ...updateData };

    try {
      const request = {
        contractId: 'ijazah-chaincode',
        contractFunction: 'UpdateSignature',
        contractArguments: [JSON.stringify(finalUpdateData)],
        readOnly: false
      };

      const result = await this.sutAdapter.sendRequests(request);
      console.log(`Worker ${this.workerIndex}: Successfully performed specific update on signature: ${signatureId}`);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to perform specific update on signature ${signatureId}:`, error.message);
      throw error;
    }
  }
}

function createWorkloadModule() {
  return new UpdateSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;