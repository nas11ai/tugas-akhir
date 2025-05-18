/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Context,
  Contract,
  Info,
  Returns,
  Transaction,
} from "fabric-contract-api";
import stringify from "json-stringify-deterministic";
import sortKeysRecursive from "sort-keys-recursive";
import { Ijazah } from "./ijazah";

@Info({
  title: "IjazahContract",
  description: "Smart contract untuk manajemen ijazah mahasiswa",
})
export class IjazahContract extends Contract {
  @Transaction()
  public InitLedger(): void {
    console.info("InitLedger dipanggil, tapi tidak melakukan apa-apa.");
  }

  @Transaction()
  public async CreateIjazah(ctx: Context, ijazahStr: string): Promise<void> {
    const ijazah = JSON.parse(ijazahStr) as Ijazah;
    const exists = await this.IjazahExists(ctx, ijazah.ID);
    if (exists) {
      throw new Error(`Ijazah dengan ID ${ijazah.ID} sudah ada`);
    }
    await ctx.stub.putState(
      ijazah.ID,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );
  }

  @Transaction(false)
  @Returns("string")
  public async ReadIjazah(ctx: Context, id: string): Promise<string> {
    const buffer = await ctx.stub.getState(id);
    if (buffer.length === 0) {
      throw new Error(`Ijazah dengan ID ${id} tidak ditemukan`);
    }
    return buffer.toString();
  }

  @Transaction()
  public async UpdateIjazah(ctx: Context, ijazahStr: string): Promise<void> {
    const ijazah = JSON.parse(ijazahStr) as Ijazah;
    const exists = await this.IjazahExists(ctx, ijazah.ID);
    if (!exists) {
      throw new Error(`Ijazah dengan ID ${ijazah.ID} tidak ditemukan`);
    }
    await ctx.stub.putState(
      ijazah.ID,
      Buffer.from(stringify(sortKeysRecursive(ijazah)))
    );
  }

  @Transaction()
  public async DeleteIjazah(ctx: Context, id: string): Promise<void> {
    const exists = await this.IjazahExists(ctx, id);
    if (!exists) {
      throw new Error(`Ijazah dengan ID ${id} tidak ditemukan`);
    }
    await ctx.stub.deleteState(id);
  }

  @Transaction(false)
  @Returns("boolean")
  public async IjazahExists(ctx: Context, id: string): Promise<boolean> {
    const buffer = await ctx.stub.getState(id);
    return buffer.length > 0;
  }

  @Transaction(false)
  @Returns("string")
  public async GetAllIjazah(ctx: Context): Promise<string> {
    const iterator = await ctx.stub.getStateByRange("", "");
    const allResults: Ijazah[] = [];

    let result = await iterator.next();
    while (!result.done) {
      try {
        const strValue = result.value.value.toString();
        const record = JSON.parse(strValue) as Ijazah;
        allResults.push(record);
      } catch (err) {
        console.error(`Gagal parse record: ${(err as Error).message}`);
      }
      result = await iterator.next();
    }

    await iterator.close();
    return JSON.stringify(allResults);
  }
}
