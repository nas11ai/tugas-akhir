'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class ReadIjazahWorkload extends WorkloadModuleBase {
    constructor() {
        super();
        this.txIndex = 0;
        this.ijazahIds = [];
    }

    async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
        await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
        this.workerIndex = workerIndex;
        
        // First, get all existing Ijazah to read from
        try {
            const getAllRequest = {
                contractId: 'ijazah',
                contractFunction: 'GetAllIjazah',
                contractArguments: [],
                readOnly: true
            };
            
            const result = await this.sutAdapter.sendRequests(getAllRequest);
            if (result && result.status && result.status.success) {
                const ijazahList = JSON.parse(result.result);
                this.ijazahIds = ijazahList.map(ijazah => ijazah.ID);
            }
        } catch (error) {
            console.log('Warning: Could not fetch existing Ijazah IDs, will use fallback strategy');
        }
    }

    async submitTransaction() {
        this.txIndex++;
        
        let ijazahId;
        
        if (this.ijazahIds.length > 0) {
            // Read existing Ijazah
            const randomIndex = Math.floor(Math.random() * this.ijazahIds.length);
            ijazahId = this.ijazahIds[randomIndex];
        } else {
            // Fallback: try to read potential IDs
            ijazahId = `IJAZAH_${this.workerIndex}_${this.txIndex}`;
        }

        const request = {
            contractId: 'ijazah',
            contractFunction: 'ReadIjazah',
            contractArguments: [ijazahId],
            readOnly: true
        };

        await this.sutAdapter.sendRequests(request);
    }

    async cleanupWorkloadModule() {
        // No cleanup needed
    }
}

function createWorkloadModule() {
    return new ReadIjazahWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;