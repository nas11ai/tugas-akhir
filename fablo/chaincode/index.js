/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

// Status constants for Ijazah
const STATUS = {
  MENUNGGU_TTD: 'menunggu tanda tangan rektor',
  DITOLAK: 'ditolak rektor',
  DISETUJUI: 'disetujui rektor',
  AKTIF: 'aktif',
  NONAKTIF: 'nonaktif'
};

class IjazahContract extends Contract {

  async InitLedger(ctx) {
    console.info('InitLedger dipanggil.');
    // No need to initialize any signature records in the new approach
  }

  // === Ijazah Management Functions ===

  async CreateIjazah(ctx, ijazahStr) {
    const ijazah = JSON.parse(ijazahStr);
    const exists = await this.IjazahExists(ctx, ijazah.ID);
    if (exists) {
      throw new Error(`Ijazah dengan ID ${ijazah.ID} sudah ada`);
    }

    ijazah.Type = 'certificate';

    // Set default status if not provided
    if (!ijazah.Status) {
      ijazah.Status = STATUS.MENUNGGU_TTD;
    }

    // Add timestamps
    ijazah.CreatedAt = new Date().toISOString();
    ijazah.UpdatedAt = new Date().toISOString();

    await ctx.stub.putState(
      ijazah.ID,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );

    return JSON.stringify(ijazah);
  }

  async ReadIjazah(ctx, id) {
    const buffer = await ctx.stub.getState(id);
    if (!buffer || buffer.length === 0) {
      throw new Error(`Ijazah dengan ID ${id} tidak ditemukan`);
    }
    return buffer.toString();
  }

  async UpdateIjazah(ctx, ijazahStr) {
    const ijazah = JSON.parse(ijazahStr);
    const exists = await this.IjazahExists(ctx, ijazah.ID);
    if (!exists) {
      throw new Error(`Ijazah dengan ID ${ijazah.ID} tidak ditemukan`);
    }

    // Update timestamp
    ijazah.UpdatedAt = new Date().toISOString();

    await ctx.stub.putState(
      ijazah.ID,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );

    return JSON.stringify(ijazah);
  }

  async DeleteIjazah(ctx, id) {
    const exists = await this.IjazahExists(ctx, id);
    if (!exists) {
      throw new Error(`Ijazah dengan ID ${id} tidak ditemukan`);
    }

    await ctx.stub.deleteState(id);
    return JSON.stringify({ success: true, message: `Ijazah dengan ID ${id} berhasil dihapus` });
  }

  async IjazahExists(ctx, id) {
    const buffer = await ctx.stub.getState(id);
    return buffer && buffer.length > 0;
  }

  async GetAllIjazah(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const allResults = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString());
          if (record.Type === 'certificate') {
            allResults.push(record);
          }
        } catch (err) {
          console.error(`Gagal parse record: ${err.message}`);
        }
      }

      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(allResults);
  }

  // === Status Management Functions ===

  async UpdateIjazahStatus(ctx, id, newStatus) {
    const ijazahBuffer = await ctx.stub.getState(id);
    if (!ijazahBuffer || ijazahBuffer.length === 0) {
      throw new Error(`Ijazah dengan ID ${id} tidak ditemukan`);
    }

    // Validate status
    if (!Object.values(STATUS).includes(newStatus)) {
      throw new Error(`Status tidak valid. Status harus salah satu dari: ${Object.values(STATUS).join(', ')}`);
    }

    const ijazah = JSON.parse(ijazahBuffer.toString());
    ijazah.Status = newStatus;
    ijazah.UpdatedAt = new Date().toISOString();

    await ctx.stub.putState(
      id,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );

    return JSON.stringify(ijazah);
  }

  async GetIjazahByStatus(ctx, status) {
    // Validate status
    if (!Object.values(STATUS).includes(status)) {
      throw new Error(`Status tidak valid. Status harus salah satu dari: ${Object.values(STATUS).join(', ')}`);
    }

    const iterator = await ctx.stub.getStateByRange('', '');
    const allResults = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString());
          // Skip non-Ijazah records and filter by status
          if (record.ID !== 'rektor_signature' && record.Status === status) {
            allResults.push(record);
          }
        } catch (err) {
          console.error(`Gagal parse record: ${err.message}`);
        }
      }

      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(allResults);
  }

  // === Signature Management Functions ===

  async CreateSignature(ctx, signatureStr) {
    // This function should be restricted to Rektor's MSP
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== 'RektorMSP' && clientMSPID !== 'AkademikMSP') {
      throw new Error('Hanya Rektor & Akademik yang dapat mengelola tanda tangan');
    }

    const signature = JSON.parse(signatureStr);

    // Validate input
    if (!signature.ID) {
      throw new Error('ID tanda tangan harus diisi');
    }

    if (!signature.URL) {
      throw new Error('URL tanda tangan harus diisi');
    }

    // Add prefix to make signature keys identifiable
    const key = `signature_${signature.ID}`;

    // Check if signature already exists
    const exists = await this.SignatureExists(ctx, key);
    if (exists) {
      throw new Error(`Tanda tangan dengan ID ${signature.ID} sudah ada`);
    }

    // Add metadata
    signature.Type = 'signature';
    signature.Owner = ctx.clientIdentity.getID();
    signature.CreatedAt = new Date().toISOString();
    signature.UpdatedAt = new Date().toISOString();
    signature.IsActive = true;

    await ctx.stub.putState(
      key,
      Buffer.from(stringify(sortKeysRecursive(signature)))
    );

    return JSON.stringify(signature);
  }

  async UpdateSignature(ctx, signatureStr) {
    // This function should be restricted to Rektor's MSP
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== 'RektorMSP' && clientMSPID !== 'AkademikMSP') {
      throw new Error('Hanya Rektor & Akademik yang dapat mengelola tanda tangan');
    }

    const signature = JSON.parse(signatureStr);

    // Validate input
    if (!signature.ID) {
      throw new Error('ID tanda tangan harus diisi');
    }

    // Add prefix to make signature keys identifiable
    const key = `signature_${signature.ID}`;

    // Check if signature exists
    const exists = await this.SignatureExists(ctx, key);
    if (!exists) {
      throw new Error(`Tanda tangan dengan ID ${signature.ID} tidak ditemukan`);
    }

    // Get existing signature
    const existingSignatureBuffer = await ctx.stub.getState(key);
    const existingSignature = JSON.parse(existingSignatureBuffer.toString());

    // Update fields but preserve metadata
    signature.Type = 'signature';
    signature.Owner = existingSignature.Owner;
    signature.CreatedAt = existingSignature.CreatedAt;
    signature.UpdatedAt = new Date().toISOString();

    // Allow toggling active status
    if (signature.IsActive === undefined) {
      signature.IsActive = existingSignature.IsActive;
    }

    await ctx.stub.putState(
      key,
      Buffer.from(stringify(sortKeysRecursive(signature)))
    );

    return JSON.stringify(signature);
  }

  async ReadSignature(ctx, id) {
    const key = `signature_${id}`;
    const buffer = await ctx.stub.getState(key);
    if (!buffer || buffer.length === 0) {
      throw new Error(`Tanda tangan dengan ID ${id} tidak ditemukan`);
    }
    return buffer.toString();
  }

  async GetActiveSignature(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    let activeSignature = null;

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString());
          if (record.Type === 'signature' && record.IsActive === true) {
            activeSignature = record;
            break;
          }
        } catch (err) {
          console.error(`Gagal parse record: ${err.message}`);
        }
      }

      if (res.done) {
        await iterator.close();
        break;
      }
    }

    if (!activeSignature) {
      throw new Error('Tidak ada tanda tangan aktif yang ditemukan');
    }

    return JSON.stringify(activeSignature);
  }

  async DeleteSignature(ctx, id) {
    // This function should be restricted to Rektor's MSP
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== 'RektorMSP' && clientMSPID !== 'AkademikMSP') {
      throw new Error('Hanya Rektor & Akademik yang dapat mengelola tanda tangan');
    }

    const key = `signature_${id}`;
    const exists = await this.SignatureExists(ctx, key);
    if (!exists) {
      throw new Error(`Tanda tangan dengan ID ${id} tidak ditemukan`);
    }

    await ctx.stub.deleteState(key);
    return JSON.stringify({ success: true, message: `Tanda tangan dengan ID ${id} berhasil dihapus` });
  }

  async SetActiveSignature(ctx, id) {
    // This function should be restricted to Rektor's MSP
    const clientMSPID = ctx.clientIdentity.getMSPID();
    if (clientMSPID !== 'RektorMSP' && clientMSPID !== 'AkademikMSP') {
      throw new Error('Hanya Rektor & Akademik yang dapat mengelola tanda tangan');
    }

    const key = `signature_${id}`;
    const exists = await this.SignatureExists(ctx, key);
    if (!exists) {
      throw new Error(`Tanda tangan dengan ID ${id} tidak ditemukan`);
    }

    // Deactivate all signatures first
    const iterator = await ctx.stub.getStateByRange('', '');
    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString());
          if (record.Type === 'signature' && record.IsActive === true) {
            record.IsActive = false;
            record.UpdatedAt = new Date().toISOString();
            await ctx.stub.putState(
              res.value.key.toString(),
              Buffer.from(stringify(sortKeysRecursive(record)))
            );
          }
        } catch (err) {
          console.error(`Gagal parse record: ${err.message}`);
        }
      }

      if (res.done) {
        await iterator.close();
        break;
      }
    }

    // Now activate the requested signature
    const signatureBuffer = await ctx.stub.getState(key);
    const signature = JSON.parse(signatureBuffer.toString());
    signature.IsActive = true;
    signature.UpdatedAt = new Date().toISOString();

    await ctx.stub.putState(
      key,
      Buffer.from(stringify(sortKeysRecursive(signature)))
    );

    return JSON.stringify(signature);
  }

  async GetAllSignatures(ctx) {
    const iterator = await ctx.stub.getStateByRange('', '');
    const allResults = [];

    while (true) {
      const res = await iterator.next();
      if (res.value && res.value.value.toString()) {
        try {
          const record = JSON.parse(res.value.value.toString());
          if (record.Type === 'signature') {
            allResults.push(record);
          }
        } catch (err) {
          console.error(`Gagal parse record: ${err.message}`);
        }
      }

      if (res.done) {
        await iterator.close();
        break;
      }
    }

    return JSON.stringify(allResults);
  }

  async SignatureExists(ctx, id) {
    const buffer = await ctx.stub.getState(id);
    return buffer && buffer.length > 0;
  }
}

exports.contracts = [IjazahContract];
