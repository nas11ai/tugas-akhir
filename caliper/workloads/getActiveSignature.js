'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class GetActiveSignatureWorkload extends WorkloadModuleBase {
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
    this.activeSignatureCount = 5;    // Number of active signatures to create
    this.inactiveSignatureCount = 3;  // Number of inactive signatures to create
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
      this.activeSignatureCount = this.roundArguments.activeSignatureCount || 5;
      this.inactiveSignatureCount = this.roundArguments.inactiveSignatureCount || 3;
      this.cleanupEnabled = this.roundArguments.cleanup !== false; // Default true
    }

    console.log(`Worker ${this.workerIndex}: Initialized with ${this.activeSignatureCount} active and ${this.inactiveSignatureCount} inactive signatures to create`);

    // Setup signatures before testing
    await this.setupSignatures();
  }

  async setupSignatures() {
    if (this.setupCompleted) {
      return;
    }

    console.log(`Worker ${this.workerIndex}: Setting up test signatures...`);

    try {
      // Create active signatures (IsActive: true)
      for (let i = 1; i <= this.activeSignatureCount; i++) {
        await this.createTestSignature(true, i);
      }

      // Create inactive signatures (IsActive: false)  
      for (let i = 1; i <= this.inactiveSignatureCount; i++) {
        await this.createTestSignature(false, i);
      }

      this.setupCompleted = true;
      console.log(`Worker ${this.workerIndex}: Setup completed. Created ${this.activeSignatureCount} active and ${this.inactiveSignatureCount} inactive signatures`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to setup signatures:`, error.message);
      throw error;
    }
  }

  async createTestSignature(isActive, index) {
    const timestamp = Date.now();
    const signatureId = `TEST_SIG_${this.workerIndex}_${this.roundIndex}_${isActive ? 'ACTIVE' : 'INACTIVE'}_${index}_${timestamp}`;

    const signatureData = {
      ID: signatureId,
      CID: `Qm${Math.random().toString(36).substring(2, 15)}${isActive ? 'active' : 'inactive'}${index}`,
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
      if (this.cleanupEnabled) {
        this.createdSignatures.push(signatureId);
      }

      console.log(`Worker ${this.workerIndex}: Created ${isActive ? 'active' : 'inactive'} signature: ${signatureId}`);

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
      contractFunction: 'GetActiveSignature',
      contractArguments: [],
      readOnly: true
    };

    try {
      const result = await this.sutAdapter.sendRequests(request);

      // Optional: Log result for debugging (remove in production)
      if (this.txIndex <= 3) { // Only log first few transactions to avoid spam
        console.log(`Worker ${this.workerIndex}: GetActiveSignature query ${this.txIndex} completed`);
      }

      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to execute GetActiveSignature query ${this.txIndex}:`, error.message);
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
      cleanupEnabled: this.cleanupEnabled,
      totalQueries: this.txIndex
    };
  }

  // Optional: Method to verify setup
  async verifySetup() {
    try {
      const request = {
        contractId: 'ijazah-chaincode',
        contractFunction: 'GetActiveSignature',
        contractArguments: [],
        readOnly: true
      };

      const result = await this.sutAdapter.sendRequests(request);
      console.log(`Worker ${this.workerIndex}: Verification - Active signatures found:`, result);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to verify setup:`, error.message);
      throw error;
    }
  }
}

function createWorkloadModule() {
  return new GetActiveSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;