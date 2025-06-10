'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class CreateSignatureWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.txIndex = 0;
  }

  async submitTransaction() {
    this.txIndex++;
    const signatureId = `SIG_${this.workerIndex}_${this.txIndex}_${Date.now()}`;
    const signatureData = {
      ID: signatureId,
      CID: `Qm${Math.random().toString(36).substring(2, 15)}abcdef1234567890`,
      IsActive: false
    };

    const request = {
      contractId: 'ijazah',
      contractFunction: 'CreateSignature',
      contractArguments: [JSON.stringify(signatureData)],
      readOnly: false,
    };

    await this.sutAdapter.sendRequests(request);
  }
}

function createWorkloadModule() {
  return new CreateSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
