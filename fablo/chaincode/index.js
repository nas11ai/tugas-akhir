/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

class IjazahContract extends Contract {

  async InitLedger() {
    console.info('InitLedger dipanggil, tapi tidak melakukan apa-apa.');
  }

  async CreateIjazah(ctx, ijazahStr) {
    const ijazah = JSON.parse(ijazahStr);
    const exists = await this.IjazahExists(ctx, ijazah.ID);
    if (exists) {
      throw new Error(`Ijazah dengan ID ${ijazah.ID} sudah ada`);
    }

    await ctx.stub.putState(
      ijazah.ID,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );
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

    await ctx.stub.putState(
      ijazah.ID,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );
  }

  async DeleteIjazah(ctx, id) {
    const exists = await this.IjazahExists(ctx, id);
    if (!exists) {
      throw new Error(`Ijazah dengan ID ${id} tidak ditemukan`);
    }

    await ctx.stub.deleteState(id);
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
          allResults.push(record);
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
}

exports.contracts = [IjazahContract];
