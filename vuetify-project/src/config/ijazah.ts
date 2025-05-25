export interface Ijazah {
  ID: string
  Type: 'certificate'
  nomorDokumen: string
  nomorIjazahNasional: string
  nama: string
  tempatLahir?: string
  tanggalLahir: string // ISO date string
  nomorIndukKependudukan: string
  programStudi: string
  fakultas: string
  tahunDiterima: string
  nomorIndukMahasiswa: string
  tanggalLulus: string // ISO date string
  jenisPendidikan: string
  gelarPendidikan: string
  akreditasiProgramStudi: string
  keputusanAkreditasiProgramStudi: string
  tempatIjazahDiberikan: string
  tanggalIjazahDiberikan: string // ISO date string
  ipfsCID?: string // IPFS Content Identifier for certificate PDF
  signatureID?: string // Reference to the active signature
  photoCID?: string // IPFS Content Identifier for student photo
  Status: string
}

export interface IjazahInput {
  nomorDokumen: string
  nomorIjazahNasional: string
  nama: string
  tempatLahir?: string
  tanggalLahir: string // ISO date string
  nomorIndukKependudukan: string
  programStudi: string
  fakultas: string
  tahunDiterima: string
  nomorIndukMahasiswa: string
  tanggalLulus: string // ISO date string
  jenisPendidikan: string
  gelarPendidikan: string
  akreditasiProgramStudi: string
  keputusanAkreditasiProgramStudi: string
  tempatIjazahDiberikan: string
  tanggalIjazahDiberikan: string // ISO date string
  ipfsCID?: string // IPFS Content Identifier for certificate PDF
  signatureID?: string // Reference to the active signature
  photoCID?: string // IPFS Content Identifier for student photo
  Status: string
}

export interface Signature {
  ID: string
  Type: 'signature'
  URL: string
  IsActive: boolean
  Owner: string
}

export interface SignatureInput {
  ID: string
  URL: string
  IsActive?: boolean
}

export const IJAZAH_STATUS = {
  MENUNGGU_TTD: 'menunggu tanda tangan rektor',
  DITOLAK: 'ditolak rektor',
  DISETUJUI: 'disetujui rektor',
  AKTIF: 'aktif',
  NONAKTIF: 'nonaktif',
}
