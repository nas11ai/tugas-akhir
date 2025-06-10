'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class ReadSignatureWorkload extends WorkloadModuleBase {
  async submitTransaction() {
    const request = {
      contractId: 'ijazah',
      contractFunction: 'GetAllSignatures',
      contractArguments: [],
      readOnly: true
    };

    await this.sutAdapter.sendRequests(request);
  }
}

function createWorkloadModule() {
  return new ReadSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
