'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

class UpdateStatusWorkload extends WorkloadModuleBase {
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

    // Track created ijazah for cleanup and updating
    this.createdIjazahIds = [];
    this.cleanupEnabled = true;

    // Configuration for ijazah generation
    this.ijazahCount = 10; // Number of ijazah to create for testing
    this.statusOptions = ['aktif', 'nonaktif'];
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
    this.createdIjazahIds = [];

    // Get configuration from round arguments
    if (this.roundArguments) {
      this.ijazahCount = this.roundArguments.ijazahCount || 10;
      this.cleanupEnabled = this.roundArguments.cleanup !== false; // Default true
      if (this.roundArguments.statusOptions) {
        this.statusOptions = this.roundArguments.statusOptions;
      }
    }

    console.log(`Worker ${this.workerIndex}: Initialized with ${this.ijazahCount} ijazah to create for status update testing`);

    // Setup ijazah before testing
    await this.setupIjazahData();
  }

  async setupIjazahData() {
    if (this.setupCompleted) {
      return;
    }

    console.log(`Worker ${this.workerIndex}: Setting up test ijazah data for status updates...`);

    try {
      // Create test ijazah data
      for (let i = 1; i <= this.ijazahCount; i++) {
        await this.createTestIjazah(i);
      }

      this.setupCompleted = true;
      console.log(`Worker ${this.workerIndex}: Setup completed. Created ${this.ijazahCount} test ijazah for status updates`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to setup ijazah data:`, error.message);
      throw error;
    }
  }

  async createTestIjazah(index) {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const uniqueId = `TEST_IJAZAH_STATUS_${this.workerIndex}_${this.roundIndex}_${index}_${timestamp}_${randomSuffix}`;

    const now = new Date().toISOString();

    const ijazahData = {
      ID: uniqueId,
      Type: "certificate",
      nomorDokumen: `ND-STATUS-${this.workerIndex}-${index}-${timestamp}`,
      nomorIjazahNasional: `NIN-STATUS-${this.workerIndex}-${index}-${timestamp}`,
      nama: `Lulusan Status Test ${this.workerIndex}-${index}`,
      tempatLahir: "Jakarta",
      tanggalLahir: "1999-05-15",
      nomorIndukKependudukan: `3175${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`,
      programStudi: "Sistem Informasi",
      fakultas: "Fakultas Teknik Informatika",
      tahunDiterima: "2018",
      nomorIndukMahasiswa: `STATUS${this.workerIndex}${index.toString().padStart(4, '0')}`,
      tanggalLulus: now.split('T')[0],
      jenisPendidikan: "Sarjana",
      gelarPendidikan: "S.Kom.",
      akreditasiProgramStudi: "A",
      keputusanAkreditasiProgramStudi: "BAN-PT 456/SK/BAN-PT/Ak-PPJ/S/VI/2021",
      tempatIjazahDiberikan: "Jakarta",
      tanggalIjazahDiberikan: now.split('T')[0],
      ipfsCID: `bafybeidummystatus${this.workerIndex}${index}${randomSuffix}`,
      signatureID: `SIG-STATUS-${uniqueId}`,
      photoCID: `bafybeidummyphoto${this.workerIndex}${index}${randomSuffix}`,
      Status: "aktif", // Initial status
      CreatedAt: now,
      UpdatedAt: now,
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'CreateIjazah',
      contractArguments: [JSON.stringify(ijazahData)],
      readOnly: false
    };

    try {
      await this.sutAdapter.sendRequests(request);

      // Track created ijazah for cleanup and status updates
      this.createdIjazahIds.push(uniqueId);

      console.log(`Worker ${this.workerIndex}: Created test ijazah for status testing: ${uniqueId}`);

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to create ijazah ${uniqueId}:`, error.message);
      throw error;
    }
  }

  async submitTransaction() {
    this.txIndex++;

    // Ensure setup is completed before running status updates
    if (!this.setupCompleted) {
      await this.setupIjazahData();
    }

    // Check if we have ijazah to update
    if (this.createdIjazahIds.length === 0) {
      console.log(`Worker ${this.workerIndex}: No ijazah available for status update (transaction ${this.txIndex})`);
      return;
    }

    // Select random ijazah to update status
    const randomIndex = Math.floor(Math.random() * this.createdIjazahIds.length);
    const ijazahId = this.createdIjazahIds[randomIndex];

    // Select random status
    const randomStatusIndex = Math.floor(Math.random() * this.statusOptions.length);
    const newStatus = this.statusOptions[randomStatusIndex];

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'UpdateIjazahStatus',
      contractArguments: [ijazahId, newStatus],
      readOnly: false
    };

    try {
      const result = await this.sutAdapter.sendRequests(request);

      // Optional: Log result for debugging (remove in production)
      if (this.txIndex <= 3) { // Only log first few transactions to avoid spam
        console.log(`Worker ${this.workerIndex}: UpdateStatus transaction ${this.txIndex} completed. ID: ${ijazahId}, New Status: ${newStatus}`);
      }

      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to update status for ijazah ${ijazahId} to ${newStatus} (transaction ${this.txIndex}):`, error.message);
      throw error;
    }
  }

  async cleanupWorkloadModule() {
    if (!this.cleanupEnabled || this.createdIjazahIds.length === 0) {
      console.log(`Worker ${this.workerIndex}: No cleanup needed or cleanup disabled`);
      return;
    }

    console.log(`Worker ${this.workerIndex}: Starting cleanup of ${this.createdIjazahIds.length} test ijazah...`);

    let cleanupSuccessCount = 0;
    let cleanupFailCount = 0;

    // Cleanup in batches to avoid overwhelming the network
    const batchSize = 5; // Smaller batch for cleanup
    const batches = [];

    for (let i = 0; i < this.createdIjazahIds.length; i += batchSize) {
      batches.push(this.createdIjazahIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const cleanupPromises = batch.map(async (ijazahId) => {
        try {
          // Try to delete the ijazah
          const deleteRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'DeleteIjazah',
            contractArguments: [ijazahId],
            readOnly: false
          };

          await this.sutAdapter.sendRequests(deleteRequest);
          cleanupSuccessCount++;

        } catch (error) {
          console.error(`Worker ${this.workerIndex}: Failed to cleanup ijazah ${ijazahId}:`, error.message);
          cleanupFailCount++;

          // Try alternative cleanup method (set status to inactive)
          try {
            const updateRequest = {
              contractId: 'ijazah-chaincode',
              contractFunction: 'UpdateIjazahStatus',
              contractArguments: [ijazahId, 'inactive'],
              readOnly: false
            };

            await this.sutAdapter.sendRequests(updateRequest);
            console.log(`Worker ${this.workerIndex}: Successfully marked ijazah ${ijazahId} as inactive for cleanup`);
            cleanupSuccessCount++;
            cleanupFailCount--; // Adjust count since we succeeded with alternative method

          } catch (alternativeError) {
            console.error(`Worker ${this.workerIndex}: Alternative cleanup also failed for ${ijazahId}:`, alternativeError.message);
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

    // Reset the tracking arrays
    this.createdIjazahIds = [];
    this.setupCompleted = false;
  }

  // Optional: Method to manually setup ijazah during testing
  async manualSetup() {
    this.setupCompleted = false;
    await this.setupIjazahData();
  }

  // Optional: Get workload statistics
  getWorkloadStats() {
    return {
      workerIndex: this.workerIndex,
      setupCompleted: this.setupCompleted,
      trackedIjazah: this.createdIjazahIds.length,
      ijazahCount: this.ijazahCount,
      cleanupEnabled: this.cleanupEnabled,
      totalStatusUpdates: this.txIndex,
      statusOptions: this.statusOptions
    };
  }

  // Optional: Method to verify setup
  async verifySetup() {
    if (this.createdIjazahIds.length === 0) {
      console.log(`Worker ${this.workerIndex}: No ijazah data to verify`);
      return;
    }

    try {
      // Test reading the first created ijazah
      const testId = this.createdIjazahIds[0];
      const request = {
        contractId: 'ijazah-chaincode',
        contractFunction: 'ReadIjazah',
        contractArguments: [testId],
        readOnly: true
      };

      const result = await this.sutAdapter.sendRequests(request);
      console.log(`Worker ${this.workerIndex}: Verification successful - Can read ijazah for status update:`, testId);
      return result;

    } catch (error) {
      console.error(`Worker ${this.workerIndex}: Failed to verify setup:`, error.message);
      throw error;
    }
  }

  // Optional: Get random ijazah ID for external use
  getRandomIjazahId() {
    if (this.createdIjazahIds.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * this.createdIjazahIds.length);
    return this.createdIjazahIds[randomIndex];
  }

  // Optional: Method to get current status distribution
  async getStatusDistribution() {
    if (this.createdIjazahIds.length === 0) {
      return {};
    }

    const statusCount = {};
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < this.createdIjazahIds.length; i += batchSize) {
      batches.push(this.createdIjazahIds.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(async (ijazahId) => {
        try {
          const request = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'ReadIjazah',
            contractArguments: [ijazahId],
            readOnly: true
          };

          const result = await this.sutAdapter.sendRequests(request);
          if (result && result.result) {
            const ijazahData = JSON.parse(result.result);
            const status = ijazahData.Status || 'unknown';
            statusCount[status] = (statusCount[status] || 0) + 1;
          }
        } catch (error) {
          // Skip failed reads
          statusCount['error'] = (statusCount['error'] || 0) + 1;
        }
      });

      await Promise.allSettled(promises);
    }

    return statusCount;
  }
}

function createWorkloadModule() {
  return new UpdateStatusWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
