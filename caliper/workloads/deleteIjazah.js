'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

class DeleteIjazahWorkload extends WorkloadModuleBase {
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

        // Track created certificates for deletion
        this.createdCertificates = [];
        this.createBeforeDelete = true; // Flag to create data before deleting
        this.deletedCertificates = [];
        this.deleteErrors = [];
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
        this.deletedCertificates = [];
        this.deleteErrors = [];

        // Check if we should create data before deleting from round arguments
        if (this.roundArguments && typeof this.roundArguments.createBeforeDelete !== 'undefined') {
            this.createBeforeDelete = this.roundArguments.createBeforeDelete;
        }

        // Check if predefined IDs are provided for deletion
        if (this.roundArguments && this.roundArguments.predefinedIds) {
            this.createdCertificates = [...this.roundArguments.predefinedIds];
            this.createBeforeDelete = false;
        }

        console.log(`Worker ${this.workerIndex}: Initialized DeleteIjazah workload with createBeforeDelete: ${this.createBeforeDelete}`);
    }

    async createIjazahForDeletion() {
        const timestamp = Date.now();
        const randomSuffix = crypto.randomBytes(4).toString('hex');
        const uniqueId = `IJAZAH_DEL_${this.workerIndex}_${this.roundIndex}_${this.txIndex}_${timestamp}_${randomSuffix}`;

        const now = new Date().toISOString();

        const ijazahData = {
            ID: uniqueId,
            Type: "certificate",
            nomorDokumen: `ND-DEL-${this.workerIndex}-${this.txIndex}-${timestamp}`,
            nomorIjazahNasional: `NIN-DEL-${this.workerIndex}-${this.txIndex}-${timestamp}`,
            nama: `Lulusan Delete Test ${this.workerIndex}-${this.txIndex}`,
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

        const createRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'CreateIjazah',
            contractArguments: [JSON.stringify(ijazahData)],
            readOnly: false
        };

        try {
            await this.sutAdapter.sendRequests(createRequest);
            this.createdCertificates.push(uniqueId);
            return uniqueId;
        } catch (error) {
            console.error(`Worker ${this.workerIndex}: Failed to create ijazah for deletion: ${uniqueId}`, error.message);
            throw error;
        }
    }

    async submitTransaction() {
        this.txIndex++;

        let certificateIdToDelete;

        if (this.createBeforeDelete) {
            // Create an ijazah first, then delete it
            certificateIdToDelete = await this.createIjazahForDeletion();
        } else {
            // Use predefined ID or generate one (might fail if doesn't exist)
            if (this.createdCertificates.length > 0) {
                // Use round-robin to select from available IDs
                const index = (this.txIndex - 1) % this.createdCertificates.length;
                certificateIdToDelete = this.createdCertificates[index];
            } else {
                // Generate a potential ID (this might fail if the ID doesn't exist)
                const timestamp = Date.now();
                const randomSuffix = crypto.randomBytes(4).toString('hex');
                certificateIdToDelete = `IJAZAH_${this.workerIndex}_${this.roundIndex}_${this.txIndex}_${timestamp}_${randomSuffix}`;
            }
        }

        const deleteRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'DeleteIjazah',
            contractArguments: [certificateIdToDelete],
            readOnly: false
        };

        try {
            await this.sutAdapter.sendRequests(deleteRequest);
            this.deletedCertificates.push(certificateIdToDelete);

            // Remove from created certificates list if it was there
            const index = this.createdCertificates.indexOf(certificateIdToDelete);
            if (index > -1) {
                this.createdCertificates.splice(index, 1);
            }

        } catch (error) {
            this.deleteErrors.push({
                id: certificateIdToDelete,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            console.error(`Worker ${this.workerIndex}: Failed to delete ijazah: ${certificateIdToDelete}`, error.message);

            // Don't throw error to continue with other transactions
            // But you can uncomment the line below if you want to fail fast
            // throw error;
        }
    }

    async cleanupWorkloadModule() {
        console.log(`Worker ${this.workerIndex}: DeleteIjazah workload cleanup started`);

        // Clean up any remaining created certificates that weren't deleted
        if (this.createdCertificates.length > 0) {
            console.log(`Worker ${this.workerIndex}: Cleaning up ${this.createdCertificates.length} remaining certificates...`);

            for (const certificateId of this.createdCertificates) {
                try {
                    const deleteRequest = {
                        contractId: 'ijazah-chaincode',
                        contractFunction: 'DeleteIjazah',
                        contractArguments: [certificateId],
                        readOnly: false
                    };

                    await this.sutAdapter.sendRequests(deleteRequest);
                    console.log(`Worker ${this.workerIndex}: Successfully cleaned up certificate: ${certificateId}`);
                } catch (error) {
                    console.error(`Worker ${this.workerIndex}: Failed to cleanup certificate ${certificateId}:`, error.message);
                }
            }
        }

        // Print statistics
        console.log(`Worker ${this.workerIndex}: DeleteIjazah Statistics:`);
        console.log(`  - Successfully deleted: ${this.deletedCertificates.length}`);
        console.log(`  - Delete errors: ${this.deleteErrors.length}`);
        console.log(`  - Remaining certificates: ${this.createdCertificates.length}`);

        if (this.deleteErrors.length > 0) {
            console.log(`Worker ${this.workerIndex}: Delete error details:`, this.deleteErrors);
        }

        // Reset arrays
        this.createdCertificates = [];
        this.deletedCertificates = [];
        this.deleteErrors = [];
    }

    // Get workload statistics
    getWorkloadStats() {
        return {
            workerIndex: this.workerIndex,
            deletedCertificates: this.deletedCertificates.length,
            deleteErrors: this.deleteErrors.length,
            remainingCertificates: this.createdCertificates.length,
            createBeforeDelete: this.createBeforeDelete
        };
    }
}

function createWorkloadModule() {
    return new DeleteIjazahWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;