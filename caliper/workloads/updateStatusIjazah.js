'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class UpdateStatusWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.txIndex = 0;
    this.ijazahIds = [];
    this.statusOptions = ['aktif', 'nonaktif'];
  }

  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
    this.workerIndex = workerIndex;

    // Get existing Ijazah IDs to update
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
      console.log('Warning: Could not fetch existing Ijazah IDs for status update');
    }
  }

  async submitTransaction() {
    this.txIndex++;

    if (this.ijazahIds.length === 0) {
      // Skip if no Ijazah available
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.ijazahIds.length);
    const ijazahId = this.ijazahIds[randomIndex];

    const randomStatusIndex = Math.floor(Math.random() * this.statusOptions.length);
    const newStatus = this.statusOptions[randomStatusIndex];

    const request = {
      contractId: 'ijazah',
      contractFunction: 'UpdateIjazahStatus',
      contractArguments: [ijazahId, newStatus],
      readOnly: false
    };

    await this.sutAdapter.sendRequests(request);
  }

  async cleanupWorkloadModule() {
    // No cleanup needed
  }
}

function createWorkloadModule() {
  return new UpdateStatusWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;