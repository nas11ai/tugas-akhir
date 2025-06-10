'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class UpdateSignatureWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.txIndex = 0;
    this.signatureIds = [];
  }

  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
    this.workerIndex = workerIndex;

    try {
      const getAllRequest = {
        contractId: 'ijazah',
        contractFunction: 'GetAllSignatures',
        contractArguments: [],
        readOnly: true
      };

      const result = await this.sutAdapter.sendRequests(getAllRequest);

      const parsedResult = Array.isArray(result) ? result[0] : result;

      if (parsedResult && parsedResult.status && parsedResult.status.success) {
        const signatureList = JSON.parse(parsedResult.result);
        this.signatureIds = signatureList.map(sig => sig.ID);
      } else {
        console.warn('Gagal mengambil data signature untuk diupdate');
      }
    } catch (err) {
      console.error('Error saat inisialisasi workload:', err);
    }
  }

  async submitTransaction() {
    this.txIndex++;

    if (this.signatureIds.length === 0) {
      console.log('Tidak ada signature untuk diupdate');
      return;
    }

    const randomIndex = Math.floor(Math.random() * this.signatureIds.length);
    const signatureId = this.signatureIds[randomIndex];

    const signatureData = {
      ID: signatureId,
      CID: `Qm${Math.random().toString(36).substring(2, 15)}UPDATEDCID`,
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
