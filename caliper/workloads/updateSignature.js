'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class UpdateSignatureWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.txIndex = 0;
  }

  async submitTransaction() {
    this.txIndex++;
    const signatureId = `SIG_${this.workerIndex}_${this.txIndex}`;
    const signatureData = {
      ID: signatureId,
      CID: `Qm${Math.random().toString(36).substring(2, 15)}updated123456`,
      IsActive: Math.random() > 0.5
    };

    const request = {
      contractId: 'ijazah',
      contractFunction: 'UpdateSignature',
      contractArguments: [JSON.stringify(signatureData)],
      readOnly: false,
    };

    await this.sutAdapter.sendRequests(request);
  }
}

function createWorkloadModule() {
  return new UpdateSignatureWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;
