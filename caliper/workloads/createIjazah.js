'use strict';

const { WorkloadModuleBase } = require('@hyperledger/caliper-core');

class CreateIjazahWorkload extends WorkloadModuleBase {
  constructor() {
    super();
    this.txIndex = 0;
  }

  async initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext) {
    await super.initializeWorkloadModule(workerIndex, totalWorkers, roundIndex, roundArguments, sutAdapter, sutContext);
    this.workerIndex = workerIndex;
  }

  async submitTransaction() {
    this.txIndex++;

    const ijazahId = `IJAZAH_${this.workerIndex}_${this.txIndex}_${Date.now()}`;
    const now = new Date().toISOString();

    const ijazahData = {
      ID: ijazahId,
      Type: "certificate",
      nomorDokumen: `ND-${this.txIndex}-${Date.now()}`,
      nomorIjazahNasional: `NIN-${this.txIndex}-${Date.now()}`,
      nama: `Lulusan Test ${this.txIndex}`,
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
      ipfsCID: `bafybeidummycert${this.txIndex}`, // dummy
      signatureID: `SIG-${ijazahId}`,
      photoCID: `bafybeidummyphoto${this.txIndex}`, // dummy
      Status: "AKTIF",
      CreatedAt: now,
      UpdatedAt: now
    };

    const request = {
      contractId: 'ijazah-chaincode',
      contractFunction: 'CreateIjazah',
      contractArguments: [JSON.stringify(ijazahData)],
      readOnly: false
    };

    await this.sutAdapter.sendRequests(request);
  }

  async cleanupWorkloadModule() {
    // No cleanup needed
  }
}

function createWorkloadModule() {
  return new CreateIjazahWorkload();
}

module.exports.createWorkloadModule = createWorkloadModule;