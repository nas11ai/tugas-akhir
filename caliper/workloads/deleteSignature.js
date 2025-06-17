'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');
const crypto = require('crypto');

class DeleteSignatureWorkload extends WorkloadModuleBase {
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

        // Track created signatures for deletion
        this.createdSignatures = [];
        this.createBeforeDelete = true; // Flag to create data before deleting
        this.deletedSignatures = [];
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
        this.createdSignatures = [];
        this.deletedSignatures = [];
        this.deleteErrors = [];

        // Check if we should create data before deleting from round arguments
        if (this.roundArguments && typeof this.roundArguments.createBeforeDelete !== 'undefined') {
            this.createBeforeDelete = this.roundArguments.createBeforeDelete;
        }

        // Check if predefined IDs are provided for deletion
        if (this.roundArguments && this.roundArguments.predefinedIds) {
            this.createdSignatures = [...this.roundArguments.predefinedIds];
            this.createBeforeDelete = false;
        }

        console.log(`Worker ${this.workerIndex}: Initialized DeleteSignature workload with createBeforeDelete: ${this.createBeforeDelete}`);
    }

    async createSignatureForDeletion() {
        const timestamp = Date.now();
        const randomSuffix = crypto.randomBytes(4).toString('hex');
        const signatureId = `SIG_DEL_${this.workerIndex}_${this.roundIndex}_${this.txIndex}_${timestamp}_${randomSuffix}`;

        const signatureData = {
            ID: signatureId,
            filePath: `/signatures/delete_test_${this.workerIndex}_${this.txIndex}.png`,
            Type: "signature",
            IsActive: false, // Create as inactive to avoid conflicts
            CreatedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
        };

        const createRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'CreateSignature',
            contractArguments: [JSON.stringify(signatureData)],
            readOnly: false
        };

        try {
            await this.sutAdapter.sendRequests(createRequest);
            this.createdSignatures.push(signatureId);
            return signatureId;
        } catch (error) {
            console.error(`Worker ${this.workerIndex}: Failed to create signature for deletion: ${signatureId}`, error.message);
            throw error;
        }
    }

    async submitTransaction() {
        this.txIndex++;

        let signatureIdToDelete;

        if (this.createBeforeDelete) {
            // Create a signature first, then delete it
            signatureIdToDelete = await this.createSignatureForDeletion();
        } else {
            // Use predefined ID or generate one (might fail if doesn't exist)
            if (this.createdSignatures.length > 0) {
                // Use round-robin to select from available IDs
                const index = (this.txIndex - 1) % this.createdSignatures.length;
                signatureIdToDelete = this.createdSignatures[index];
            } else {
                // Generate a potential ID (this might fail if the ID doesn't exist)
                const timestamp = Date.now();
                const randomSuffix = crypto.randomBytes(4).toString('hex');
                signatureIdToDelete = `SIG_${this.workerIndex}_${this.roundIndex}_${this.txIndex}_${timestamp}_${randomSuffix}`;
            }
        }

        const deleteRequest = {
            contractId: 'ijazah-chaincode',
            contractFunction: 'DeleteSignature',
            contractArguments: [signatureIdToDelete],
            readOnly: false
        };

        try {
            await this.sutAdapter.sendRequests(deleteRequest);
            this.deletedSignatures.push(signatureIdToDelete);

            // Remove from created signatures list if it was there
            const index = this.createdSignatures.indexOf(signatureIdToDelete);
            if (index > -1) {
                this.createdSignatures.splice(index, 1);
            }

        } catch (error) {
            this.deleteErrors.push({
                id: signatureIdToDelete,
                error: error.message,
                timestamp: new Date().toISOString()
            });
            console.error(`Worker ${this.workerIndex}: Failed to delete signature: ${signatureIdToDelete}`, error.message);

            // Don't throw error to continue with other transactions
            // But you can uncomment the line below if you want to fail fast
            // throw error;
        }
    }

    async cleanupWorkloadModule() {
        console.log(`Worker ${this.workerIndex}: DeleteSignature workload cleanup started`);

        // Clean up any remaining created signatures that weren't deleted
        if (this.createdSignatures.length > 0) {
            console.log(`Worker ${this.workerIndex}: Cleaning up ${this.createdSignatures.length} remaining signatures...`);

            for (const signatureId of this.createdSignatures) {
                try {
                    const deleteRequest = {
                        contractId: 'ijazah-chaincode',
                        contractFunction: 'DeleteSignature',
                        contractArguments: [signatureId],
                        readOnly: false
                    };

                    await this.sutAdapter.sendRequests(deleteRequest);
                    console.log(`Worker ${this.workerIndex}: Successfully cleaned up signature: ${signatureId}`);
                } catch (error) {
                    console.error(`Worker ${this.workerIndex}: Failed to cleanup signature ${signatureId}:`, error.message);
                }
            }
        }

        // Print statistics
        console.log(`Worker ${this.workerIndex}: DeleteSignature Statistics:`);
        console.log(`  - Successfully deleted: ${this.deletedSignatures.length}`);
        console.log(`  - Delete errors: ${this.deleteErrors.length}`);
        console.log(`  - Remaining signatures: ${this.createdSignatures.length}`);

        if (this.deleteErrors.length > 0) {
            console.log(`Worker ${this.workerIndex}: Delete error details:`, this.deleteErrors);
        }

        // Reset arrays
        this.createdSignatures = [];
        this.deletedSignatures = [];
        this.deleteErrors = [];
    }

    // Get workload statistics
    getWorkloadStats() {
        return {
            workerIndex: this.workerIndex,
            deletedSignatures: this.deletedSignatures.length,
            deleteErrors: this.deleteErrors.length,
            remainingSignatures: this.createdSignatures.length,
            createBeforeDelete: this.createBeforeDelete
        };
    }
}

function createWorkloadModule() {
    return new DeleteSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;