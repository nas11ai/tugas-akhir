'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class InitWorkload extends WorkloadModuleBase {
  constructor() {
    super();
  }

  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
  }

  async submitTransaction() {
    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'InitLedger',
      contractArguments: [],
      readOnly: false
    };

    await this.sutAdapter.sendRequests(request);
  }

  async cleanupWorkloadModule() {
    // No cleanup needed
  }
}

function createWorkloadModule() {
  return new InitWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;