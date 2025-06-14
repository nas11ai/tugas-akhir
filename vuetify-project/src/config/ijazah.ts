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
  photoPath?: string // Local file path for student photo
  Status: string
  CreatedAt: string // ISO date string
  UpdatedAt: string // ISO date string
}

export interface Mahasiswa {
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
}

export interface IjazahInput extends Mahasiswa {
  ipfsCID?: string // IPFS Content Identifier for certificate PDF
  signatureID?: string // Reference to the active signature
  photoPath?: string // Local file path for student photo
  Status: string
}

export interface Signature {
  ID: string
  Type: 'signature'
  filePath: string // Local file path for signature
  IsActive: boolean
  Owner: string
  CreatedAt: string // ISO date string
  UpdatedAt: string // ISO date string
}

export interface SignatureInput {
  ID: string
  filePath: string // Local file path for signature
  IsActive?: boolean
}

export const IJAZAH_STATUS = {
  MENUNGGU_TTD: 'menunggu tanda tangan rektor',
  DITOLAK: 'ditolak rektor',
  DISETUJUI: 'disetujui rektor',
  AKTIF: 'aktif',
  NONAKTIF: 'nonaktif',
}
