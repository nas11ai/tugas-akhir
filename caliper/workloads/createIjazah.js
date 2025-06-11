'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

class CreateIjazahWorkload extends WorkloadModuleBase {
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

    // Track created certificates for cleanup
    this.createdCertificates = [];
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
    this.createdCertificates = [];

    // Check if cleanup is enabled from round arguments
    if (this.roundArguments && typeof this.roundArguments.cleanup !== 'undefined') {
      this.cleanupEnabled = this.roundArguments.cleanup;
    }

    console.log(`Worker ${this.workerIndex}: Initialized with cleanup ${this.cleanupEnabled ? 'enabled' : 'disabled'}`);
  }

  async submitTransaction() {
    this.txIndex++;

    // Generate unique ID menggunakan timestamp, worker index, dan random string
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const uniqueId = `IJAZAH_${this.workerIndex}_${this.roundIndex}_${this.txIndex}_${timestamp}_${randomSuffix}`;

    const now = new Date().toISOString();

    const ijazahData = {
      ID: uniqueId,
      Type: "certificate",
      nomorDokumen: `ND-${this.workerIndex}-${this.txIndex}-${timestamp}`,
      nomorIjazahNasional: `NIN-${this.workerIndex}-${this.txIndex}-${timestamp}`,
      nama: `Lulusan Test ${this.workerIndex}-${this.txIndex}`,
      tempatLahir: "Balikpapan",
      tanggalLahir: "2000-01-01",
      nomorIndukKependudukan: `6401${Math.floor(Math.random() * 1e10).toString().padStart(10, '0')}`,
      programStudi: "Teknik Informatika",
      fakultas: "Fakultas Sains dan Teknologi Informasi",
      tahunDiterima: "2019",
      nomorIndukMahasiswa: `NIM${this.workerIndex}${this.txIndex.toString().padStart(4, '0')}`,
      tanggalLulus: now.split('T')[0],
      jenisPendidikan: "Sarjana",
      gelarPendidikan: "S.T.",
      akreditasiProgramStudi: "A",
      keputusanAkreditasiProgramStudi: "BAN-PT 123/SK/BAN-PT/Ak-PPJ/S/III/2022",
      tempatIjazahDiberikan: "Balikpapan",
      tanggalIjazahDiberikan: now.split('T')[0],
      ipfsCID: `bafybeidummycert${this.workerIndex}${this.txIndex}${randomSuffix}`,
      signatureID: `SIG-${uniqueId}`,
      photoCID: `bafybeidummyphoto${this.workerIndex}${this.txIndex}${randomSuffix}`,
      Status: "aktif",
      CreatedAt: now,
      UpdatedAt: now
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'CreateIjazah',
      contractArguments: [JSON.stringify(ijazahData)],
      readOnly: false
    };

    try {
      await this.sutAdapter.sendRequests(request);

      // Track successfully created certificate for cleanup
      if (this.cleanupEnabled) {
        this.createdCertificates.push(uniqueId);
      }

    } catch (error) {
      console.error(`Failed to submit transaction for ID: ${uniqueId}`, error.message);
      throw error;
    }
  }

  async cleanupWorkloadModule() {
    if (!this.cleanupEnabled || this.createdCertificates.length === 0) {
      console.log(`Worker ${this.workerIndex}: No cleanup needed or cleanup disabled`);
      return;
    }

    console.log(`Worker ${this.workerIndex}: Starting cleanup of ${this.createdCertificates.length} certificates...`);

    let cleanupSuccessCount = 0;
    let cleanupFailCount = 0;

    // Cleanup in batches to avoid overwhelming the network
    const batchSize = 10;
    const batches = [];

    for (let i = 0; i < this.createdCertificates.length; i += batchSize) {
      batches.push(this.createdCertificates.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const cleanupPromises = batch.map(async (certificateId) => {
        try {
          // Assuming your chaincode has a DeleteIjazah function
          // Adjust the function name according to your actual chaincode
          const deleteRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'DeleteIjazah',
            contractArguments: [certificateId],
            readOnly: false
          };

          await this.sutAdapter.sendRequests(deleteRequest);
          cleanupSuccessCount++;

        } catch (error) {
          console.error(`Worker ${this.workerIndex}: Failed to cleanup certificate ${certificateId}:`, error.message);
          cleanupFailCount++;

          // Try alternative cleanup method (set status to inactive)
          try {
            const updateRequest = {
              contractId: 'ijazah-chaincode',
              contractFunction: 'UpdateIjazahStatus',
              contractArguments: [certificateId, 'inactive'],
              readOnly: false
            };

            await this.sutAdapter.sendRequests(updateRequest);
            console.log(`Worker ${this.workerIndex}: Successfully marked certificate ${certificateId} as inactive`);
            cleanupSuccessCount++;
            cleanupFailCount--; // Adjust count since we succeeded with alternative method

          } catch (alternativeError) {
            console.error(`Worker ${this.workerIndex}: Alternative cleanup also failed for ${certificateId}:`, alternativeError.message);
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
    this.createdCertificates = [];
  }

  // Optional: Method to manually trigger cleanup during testing
  async manualCleanup() {
    await this.cleanupWorkloadModule();
  }

  // Optional: Get cleanup statistics
  getCleanupStats() {
    return {
      workerIndex: this.workerIndex,
      trackedCertificates: this.createdCertificates.length,
      cleanupEnabled: this.cleanupEnabled
    };
  }
}

function createWorkloadModule() {
  return new CreateIjazahWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
