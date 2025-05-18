/*
  SPDX-License-Identifier: Apache-2.0
*/

import { Object, Property } from "fabric-contract-api";

@Object()
export class Ijazah {
  @Property()
  public ID: string = "";

  @Property()
  public nomorDokumenIjazah: string = "";

  @Property()
  public nomorIjazahNasional: string = "";

  @Property()
  public namaMahasiswa: string = "";

  @Property()
  public tempatLahir: string = "";

  @Property()
  public tanggalLahir: string = ""; // konversi Date.toString()

  @Property()
  public nomorIndukKependudukan: string = "";

  @Property()
  public universitas: string = "";

  @Property()
  public fakultas: string = "";

  @Property()
  public programStudi: string = "";

  @Property()
  public tahunDiterima: string = "";

  @Property()
  public nomorIndukMahasiswa: string = "";

  @Property()
  public tanggalLulus: string = ""; // konversi Date.toString()

  @Property()
  public gelarKelulusan: string = "";

  @Property()
  public tempatIjazahDiberikan: string = "";

  @Property()
  public tanggalIjazahDiberikan: string = ""; // konversi Date.toString()

  @Property()
  public ipfsPasFoto?: string = "";

  @Property()
  public ipfsIjazah?: string = "";
}
