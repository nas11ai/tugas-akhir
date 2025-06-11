'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

class ReadSignatureWorkload extends WorkloadModuleBase {
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
    this.activeSignatureCount = 8;    // Number of active signatures to create
    this.inactiveSignatureCount = 4;  // Number of inactive signatures to create
    this.totalSignatureCount = 12;    // Total signatures to create for testing
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
      this.activeSignatureCount = this.roundArguments.activeSignatureCount || 8;
      this.inactiveSignatureCount = this.roundArguments.inactiveSignatureCount || 4;
      this.totalSignatureCount = this.roundArguments.totalSignatureCount || 12;
      this.cleanupEnabled = this.roundArguments.cleanup !== false; // Default true
    }

    console.log(`Worker ${this.workerIndex}: Initialized with ${this.activeSignatureCount} active, ${this.inactiveSignatureCount} inactive, and ${this.totalSignatureCount} total signatures to create`);

    // Setup signatures before testing
    await this.setupSignatures();
  }

  async setupSignatures() {
    if (this.setupCompleted) {
      return;
    }

    console.log(`Worker ${this.workerIndex}: Setting up test signatures for GetAllSignatures testing...`);

    try {
      // Create active signatures (IsActive: true)
      for (let i = 1; i <= this.activeSignatureCount; i++) {
        await this.createTestSignature(true, i, 'ACTIVE');
      }

      // Create inactive signatures (IsActive: false)  
      for (let i = 1; i <= this.inactiveSignatureCount; i++) {
        await this.createTestSignature(false, i, 'INACTIVE');
      }

      // Create additional mixed signatures to reach total count
      const remainingCount = this.totalSignatureCount - this.activeSignatureCount - this.inactiveSignatureCount;
      for (let i = 1; i <= remainingCount; i++) {
        const isActive = Math.random() > 0.5; // Random active/inactive
        await this.createTestSignature(isActive, i, 'MIXED');
      }

      this.setupCompleted = true;
      console.log(`Worker ${this.workerIndex}: Setup completed. Created ${this.createdSignatures.length} total signatures for GetAllSignatures testing`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to setup signatures:`, error.message);
      throw error;
    }
  }

  async createTestSignature(isActive, index, category) {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const signatureId = `TEST_SIG_READ_${this.workerIndex}_${this.roundIndex}_${category}_${index}_${timestamp}_${randomSuffix}`;

    const now = new Date().toISOString();

    const signatureData = {
      ID: signatureId,
      CID: `Qm${crypto.randomBytes(8).toString('hex')}${isActive ? 'active' : 'inactive'}${index}${randomSuffix}`,
      IsActive: isActive,
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'CreateSignature',
      contractArguments: [JSON.stringify(signatureData)],
      readOnly: false
    };

    try {
      await this.sutAdapter.sendRequests(request);

      // Track created signature for cleanup
      this.createdSignatures.push(signatureId);

      console.log(`Worker ${this.workerIndex}: Created ${isActive ? 'active' : 'inactive'} signature (${category}): ${signatureId}`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to create signature ${signatureId}:`, error.message);
      throw error;
    }
  }

  async submitTransaction() {
    this.txIndex++;

    // Ensure setup is completed before running queries
    if (!this.setupCompleted) {
      await this.setupSignatures();
    }

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'GetAllSignatures',
      contractArguments: [],
      readOnly: true
    };

    try {
      const result = await this.sutAdapter.sendRequests(request);

      // Optional: Log result for debugging (remove in production)
      if (this.txIndex <= 3) { // Only log first few transactions to avoid spam
        console.log(`Worker ${this.workerIndex}: GetAllSignatures query ${this.txIndex} completed`);

        // Optional: Log count of returned signatures for verification
        if (result && result.result) {
          try {
            const signatures = JSON.parse(result.result);
            if (Array.isArray(signatures)) {
              console.log(`Worker ${this.workerIndex}: Retrieved ${signatures.length} signatures from GetAllSignatures`);
            }
          } catch (parseError) {
            // Ignore parsing errors for logging
          }
        }
      }

      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to execute GetAllSignatures query ${this.txIndex}:`, error.message);
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
    const batchSize = 5; // Smaller batch for cleanup
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
      activeSignatureCount: this.activeSignatureCount,
      inactiveSignatureCount: this.inactiveSignatureCount,
      totalSignatureCount: this.totalSignatureCount,
      cleanupEnabled: this.cleanupEnabled,
      totalQueries: this.txIndex
    };
  }

  // Optional: Method to verify setup by running GetAllSignatures
  async verifySetup() {
    try {
      const request = {
        contractId: 'ijazah-chaincode',
        contractFunction: 'GetAllSignatures',
        contractArguments: [],
        readOnly: true
      };

      const result = await this.sutAdapter.sendRequests(request);

      if (result && result.result) {
        try {
          const signatures = JSON.parse(result.result);
          const ourSignatures = signatures.filter(sig =>
            sig.ID && sig.ID.includes(`TEST_SIG_READ_${this.workerIndex}_${this.roundIndex}`)
          );
          console.log(`Worker ${this.workerIndex}: Verification - Found ${ourSignatures.length} of our signatures in GetAllSignatures`);
        } catch (parseError) {
          console.log(`Worker ${this.workerIndex}: Verification - GetAllSignatures returned data (could not parse for count)`);
        }
      }

      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to verify setup:`, error.message);
      throw error;
    }
  }

  // Optional: Method to get signature statistics
  async getSignatureStats() {
    try {
      const request = {
        contractId: 'ijazah-chaincode',
        contractFunction: 'GetAllSignatures',
        contractArguments: [],
        readOnly: true
      };

      const result = await this.sutAdapter.sendRequests(request);

      if (result && result.result) {
        const signatures = JSON.parse(result.result);
        const stats = {
          total: signatures.length,
          active: signatures.filter(sig => sig.IsActive === true).length,
          inactive: signatures.filter(sig => sig.IsActive === false).length,
          ours: signatures.filter(sig =>
            sig.ID && sig.ID.includes(`TEST_SIG_READ_${this.workerIndex}_${this.roundIndex}`)
          ).length
        };
        return stats;
      }

      return { total: 0, active: 0, inactive: 0, ours: 0 };

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to get signature stats:`, error.message);
      return { total: 0, active: 0, inactive: 0, ours: 0, error: error.message };
    }
  }

  // Optional: Method to test specific signature retrieval
  async testSpecificSignature(signatureId) {
    if (!signatureId && this.createdSignatures.length > 0) {
      signatureId = this.createdSignatures[0];
    }

    if (!signatureId) {
      console.log(`Worker ${this.workerIndex}: No signature ID provided for specific test`);
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
      console.log(`Worker ${this.workerIndex}: Successfully read specific signature: ${signatureId}`);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to read specific signature ${signatureId}:`, error.message);
      throw error;
    }
  }
}

function createWorkloadModule() {
  return new ReadSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
