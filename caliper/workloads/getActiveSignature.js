'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class GetActiveSignatureWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.txIndex = 0;
  }

  async submitTransaction() {
    this.txIndex++;

    const request = {
      contractId: 'ijazah',
      contractFunction: 'GetActiveSignature',
      contractArguments: [],
      readOnly: true,
    };

    await this.sutAdapter.sendRequests(request);
  }

  async cleanupWorkloadModule() {
    // Tidak ada cleanup khusus
  }
}

function createWorkloadModule() {
  return new GetActiveSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
