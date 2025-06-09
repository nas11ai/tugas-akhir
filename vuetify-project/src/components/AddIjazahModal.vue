<!-- Modal Form Tambah Ijazah dengan Pencarian NIM -->
<template>
  <v-dialog v-model="dialog" max-width="900px" persistent>
    <v-card>
      <v-card-title class="text-h5 primary white--text">
        <v-icon left color="white">mdi-certificate</v-icon>
        Tambah Pengajuan Ijazah Baru
      </v-card-title>

      <v-divider></v-divider>

      <!-- Stepper untuk navigasi -->
      <v-stepper v-model="currentStep" class="elevation-0">
        <v-stepper-header>
          <v-stepper-item
            :complete="currentStep > 1"
            :value="1"
            color="primary"
          >
            Cari Mahasiswa
          </v-stepper-item>
          <v-divider></v-divider>
          <v-stepper-item
            :complete="currentStep > 2"
            :value="2"
            color="primary"
            :disabled="!mahasiswaData"
          >
            Lengkapi Data Ijazah
          </v-stepper-item>
        </v-stepper-header>

        <v-stepper-items>
          <!-- Step 1: Pencarian Mahasiswa -->
          <v-stepper-content :value="1">
            <v-card class="mb-4" outlined>
              <v-card-text class="pa-6">
                <v-row align="center">
                  <v-col cols="12" md="8">
                    <v-text-field
                      v-model="nimSearch"
                      label="Masukkan NIM Mahasiswa"
                      placeholder="Contoh: 2021001001"
                      outlined
                      dense
                      :rules="nimRules"
                      :loading="searchLoading"
                      @keyup.enter="searchMahasiswa"
                      append-icon="mdi-magnify"
                      @click:append="searchMahasiswa"
                    >
                      <template v-slot:prepend-inner>
                        <v-icon>mdi-account-search</v-icon>
                      </template>
                    </v-text-field>
                  </v-col>
                  <v-col cols="12" md="4">
                    <v-btn
                      color="primary"
                      block
                      @click="searchMahasiswa"
                      :loading="searchLoading"
                      :disabled="!nimSearch || nimSearch.length < 5"
                    >
                      <v-icon left>mdi-magnify</v-icon>
                      Cari Mahasiswa
                    </v-btn>
                  </v-col>
                </v-row>

                <!-- Error Alert jika mahasiswa tidak ditemukan -->
                <v-alert
                  v-if="searchError"
                  type="error"
                  dismissible
                  class="mt-4"
                  @input="searchError = ''"
                >
                  <v-icon left>mdi-alert-circle</v-icon>
                  {{ searchError }}
                </v-alert>

                <!-- Info Alert jika belum search -->
                <v-alert
                  v-if="!mahasiswaData && !searchError && !searchLoading"
                  type="info"
                  outlined
                  class="mt-4"
                >
                  <v-icon left>mdi-information</v-icon>
                  Silakan masukkan NIM untuk mencari data mahasiswa
                </v-alert>

                <!-- Data Mahasiswa yang ditemukan -->
                <v-card
                  v-if="mahasiswaData"
                  class="mt-4"
                  outlined
                  color="success"
                  dark
                >
                  <v-card-subtitle class="white--text">
                    <v-icon left color="white">mdi-check-circle</v-icon>
                    Data Mahasiswa Ditemukan
                  </v-card-subtitle>
                  <v-card-text>
                    <v-row>
                      <v-col cols="12" md="6">
                        <div class="text-body-2 mb-1">
                          <strong>Nama:</strong>
                        </div>
                        <div class="text-body-1">{{ mahasiswaData.nama }}</div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="text-body-2 mb-1">
                          <strong>NIM:</strong>
                        </div>
                        <div class="text-body-1">
                          {{ mahasiswaData.nomorIndukMahasiswa }}
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="text-body-2 mb-1">
                          <strong>Program Studi:</strong>
                        </div>
                        <div class="text-body-1">
                          {{ mahasiswaData.programStudi }}
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="text-body-2 mb-1">
                          <strong>Fakultas:</strong>
                        </div>
                        <div class="text-body-1">
                          {{ mahasiswaData.fakultas }}
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="text-body-2 mb-1">
                          <strong>Tahun Diterima:</strong>
                        </div>
                        <div class="text-body-1">
                          {{ mahasiswaData.tahunDiterima }}
                        </div>
                      </v-col>
                      <v-col cols="12" md="6">
                        <div class="text-body-2 mb-1">
                          <strong>Tanggal Lulus:</strong>
                        </div>
                        <div class="text-body-1">
                          {{ formatDate(mahasiswaData.tanggalLulus) }}
                        </div>
                      </v-col>
                    </v-row>
                  </v-card-text>
                </v-card>
              </v-card-text>
            </v-card>

            <div class="d-flex justify-space-between">
              <v-btn color="grey" outlined @click="closeDialog">
                <v-icon left>mdi-close</v-icon>
                Batal
              </v-btn>
              <v-btn
                color="primary"
                @click="currentStep = 2"
                :disabled="!mahasiswaData"
              >
                Lanjutkan
                <v-icon right>mdi-arrow-right</v-icon>
              </v-btn>
            </div>
          </v-stepper-content>

          <!-- Step 2: Form Data Ijazah -->
          <v-stepper-content :value="2">
            <v-form ref="form" v-model="valid" lazy-validation>
              <v-row>
                <!-- Data Dokumen -->
                <v-col cols="12">
                  <v-card outlined class="mb-4">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-file-document</v-icon>
                      Data Dokumen
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.nomorDokumen"
                            label="Nomor Dokumen"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.nomorIjazahNasional"
                            label="Nomor Ijazah Nasional"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Data Mahasiswa (Read-only, sudah terisi dari pencarian) -->
                <v-col cols="12">
                  <v-card outlined class="mb-4" color="grey lighten-5">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-account</v-icon>
                      Data Mahasiswa (Otomatis dari Pencarian)
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.nama"
                            label="Nama Lengkap"
                            outlined
                            dense
                            readonly
                            background-color="grey lighten-4"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.nomorIndukMahasiswa"
                            label="NIM"
                            outlined
                            dense
                            readonly
                            background-color="grey lighten-4"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.programStudi"
                            label="Program Studi"
                            outlined
                            dense
                            readonly
                            background-color="grey lighten-4"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.fakultas"
                            label="Fakultas"
                            outlined
                            dense
                            readonly
                            background-color="grey lighten-4"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.tahunDiterima"
                            label="Tahun Diterima"
                            outlined
                            dense
                            readonly
                            background-color="grey lighten-4"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.tanggalLulus"
                            label="Tanggal Lulus"
                            outlined
                            dense
                            readonly
                            background-color="grey lighten-4"
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Data Tambahan (Manual Input) -->
                <v-col cols="12">
                  <v-card outlined class="mb-4">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-account-edit</v-icon>
                      Data Tambahan
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.tempatLahir"
                            label="Tempat Lahir"
                            outlined
                            dense
                            hint="Opsional"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.tanggalLahir"
                            label="Tanggal Lahir"
                            type="date"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.nomorIndukKependudukan"
                            label="NIK"
                            :rules="[...requiredRules, ...nikRules]"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-file-input
                            v-model="photoFile"
                            label="Foto Mahasiswa"
                            prepend-icon="mdi-camera"
                            accept="image/png,image/jpeg"
                            :rules="photoRules"
                            outlined
                            dense
                            show-size
                            @change="onPhotoChange"
                          >
                            <template v-slot:selection="{ fileNames }">
                              <v-chip small label color="primary">
                                {{ fileNames.join(', ') }}
                              </v-chip>
                            </template>
                          </v-file-input>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Data Pendidikan -->
                <v-col cols="12">
                  <v-card outlined class="mb-4">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-school</v-icon>
                      Data Pendidikan
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-select
                            v-model="formData.jenisPendidikan"
                            :items="jenisPendidikanOptions"
                            label="Jenis Pendidikan"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.gelarPendidikan"
                            label="Gelar Pendidikan"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Data Akreditasi -->
                <v-col cols="12">
                  <v-card outlined class="mb-4">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-medal</v-icon>
                      Data Akreditasi
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-select
                            v-model="formData.akreditasiProgramStudi"
                            :items="akreditasiOptions"
                            label="Akreditasi Program Studi"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.keputusanAkreditasiProgramStudi"
                            label="Keputusan Akreditasi Program Studi"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Data Penerbitan -->
                <v-col cols="12">
                  <v-card outlined class="mb-4">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-calendar-check</v-icon>
                      Data Penerbitan Ijazah
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.tempatIjazahDiberikan"
                            label="Tempat Ijazah Diberikan"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="6">
                          <v-text-field
                            v-model="formData.tanggalIjazahDiberikan"
                            label="Tanggal Ijazah Diberikan"
                            type="date"
                            :rules="requiredRules"
                            outlined
                            dense
                            required
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>

                <!-- Data IPFS & Signature (Optional, bisa diisi nanti) -->
                <v-col cols="12">
                  <v-card outlined class="mb-4">
                    <v-card-subtitle class="primary--text font-weight-bold">
                      <v-icon left color="primary">mdi-link</v-icon>
                      Data IPFS & Signature (Opsional)
                    </v-card-subtitle>
                    <v-card-text>
                      <v-row>
                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model="formData.ipfsCID"
                            label="IPFS CID (Certificate)"
                            outlined
                            dense
                            hint="Akan diisi otomatis setelah upload"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model="formData.signatureID"
                            label="Signature ID"
                            outlined
                            dense
                            hint="Akan diisi otomatis setelah signing"
                          ></v-text-field>
                        </v-col>
                        <v-col cols="12" md="4">
                          <v-text-field
                            v-model="formData.photoCID"
                            label="Photo IPFS CID"
                            outlined
                            dense
                            hint="Akan diisi otomatis setelah upload foto"
                          ></v-text-field>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-form>

            <div class="d-flex justify-space-between">
              <v-btn color="grey" outlined @click="currentStep = 1">
                <v-icon left>mdi-arrow-left</v-icon>
                Kembali
              </v-btn>
              <div>
                <v-btn
                  color="grey"
                  outlined
                  @click="closeDialog"
                  class="mr-2"
                  :disabled="loading"
                >
                  <v-icon left>mdi-close</v-icon>
                  Batal
                </v-btn>
                <v-btn
                  color="primary"
                  @click="submitForm"
                  :loading="loading"
                  :disabled="!valid"
                >
                  <v-icon left>mdi-content-save</v-icon>
                  Simpan Ijazah
                </v-btn>
              </div>
            </div>
          </v-stepper-content>
        </v-stepper-items>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, defineEmits, defineProps } from 'vue'
import { apiService, apiHelper, type ApiError } from '@/config/axios'
import { type IjazahInput } from '@/config/ijazah'

// Import enum/const untuk status
// const IJAZAH_STATUS = { /* your status values */ }

// Props & Emits
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [message: string]
  error: [message: string]
}>()

// Reactive data
const dialog = ref(false)
const valid = ref(false)
const loading = ref(false)
const searchLoading = ref(false)
const form = ref()
const photoFile = ref<File | null>(null)
const currentStep = ref(1)

// Search data
const nimSearch = ref('')
const searchError = ref('')
const mahasiswaData = ref<IjazahInput | null>()

// Form data
const formData = ref<IjazahInput>({
  nomorDokumen: '',
  nomorIjazahNasional: '',
  nama: '',
  tempatLahir: '',
  tanggalLahir: '',
  nomorIndukKependudukan: '',
  programStudi: '',
  fakultas: '',
  tahunDiterima: '',
  nomorIndukMahasiswa: '',
  tanggalLulus: '',
  jenisPendidikan: '',
  gelarPendidikan: '',
  akreditasiProgramStudi: '',
  keputusanAkreditasiProgramStudi: '',
  tempatIjazahDiberikan: '',
  tanggalIjazahDiberikan: '',
})

// Options for select fields
const jenisPendidikanOptions = [
  'Diploma (D3)',
  'Sarjana Terapan (D4)',
  'Sarjana (S1)',
  'Magister (S2)',
  'Doktor (S3)',
]
const akreditasiOptions = ['A', 'B', 'C', 'Unggul', 'Baik Sekali', 'Baik']

// Validation rules
const requiredRules = [(v: string) => !!v || 'Field ini wajib diisi']

const nimRules = [
  (v: string) => !!v || 'NIM wajib diisi',
  (v: string) => v.length >= 5 || 'NIM minimal 5 karakter',
]

const nikRules = [
  (v: string) => /^\d{16}$/.test(v) || 'NIK harus 16 digit angka',
]

const photoRules = [
  (v: File[] | File | null) => {
    if (!v) return 'Foto mahasiswa wajib diupload'
    const file = Array.isArray(v) ? v[0] : v
    if (!file) return 'Foto mahasiswa wajib diupload'

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return 'Ukuran file maksimal 5MB'
    }

    return true
  },
]

// Watch for dialog changes
watch(
  () => props.modelValue,
  (newVal) => {
    dialog.value = newVal
  }
)

watch(dialog, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    resetForm()
  }
})

// Helper functions
const formatDate = (dateString: string) => {
  if (!dateString || dateString === 'NULL') return ''
  return new Date(dateString).toLocaleDateString('id-ID')
}

const convertIndonesianDateToISO = (indonesianDate: string): string => {
  if (!indonesianDate || indonesianDate === 'NULL') return ''

  // Map Indonesian month names to numbers
  const monthMap: { [key: string]: string } = {
    Januari: '01',
    Februari: '02',
    Maret: '03',
    April: '04',
    Mei: '05',
    Juni: '06',
    Juli: '07',
    Agustus: '08',
    September: '09',
    Oktober: '10',
    November: '11',
    Desember: '12',
  }

  // Parse "27 Juni 2024" format
  const parts = indonesianDate.trim().split(' ')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = monthMap[parts[1]]
    const year = parts[2]

    if (month) {
      return `${year}-${month}-${day}`
    }
  }

  // If it's already in a valid format, try to parse it
  const date = new Date(indonesianDate)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  return ''
}

const convertDateTimeToISO = (dateTimeString: string): string => {
  if (!dateTimeString || dateTimeString === 'NULL') return ''

  // Parse "2020-09-07 00:00:00.000" format
  const date = new Date(dateTimeString)
  if (!isNaN(date.getTime())) {
    return date.toISOString()
  }

  return ''
}

// Methods
const searchMahasiswa = async () => {
  if (!nimSearch.value || nimSearch.value.length < 5) {
    searchError.value = 'Silakan masukkan NIM yang valid (minimal 5 karakter)'
    return
  }

  searchLoading.value = true
  searchError.value = ''
  mahasiswaData.value = null

  try {
    const response = await apiService.ijazah.findMahasiswaByNim(nimSearch.value)

    if (apiHelper.isSuccess(response)) {
      mahasiswaData.value = response.data.data

      if (!mahasiswaData.value) {
        searchError.value = `Mahasiswa dengan NIM "${nimSearch.value}" tidak ditemukan di database. Pastikan NIM yang dimasukkan benar.`
        return
      }

      // Pre-fill form data dengan data mahasiswa
      fillFormWithMahasiswaData(mahasiswaData.value)

      searchError.value = ''
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error searching mahasiswa:', error)
    const errorMessage = apiHelper.getErrorMessage(error as ApiError)

    if (errorMessage.includes('tidak ditemukan')) {
      searchError.value = `Mahasiswa dengan NIM "${nimSearch.value}" tidak ditemukan di database. Pastikan NIM yang dimasukkan benar.`
    } else {
      searchError.value = `Gagal mencari data mahasiswa: ${errorMessage}`
    }

    mahasiswaData.value = null
  } finally {
    searchLoading.value = false
  }
}

const fillFormWithMahasiswaData = (data: IjazahInput) => {
  formData.value.nama = data.nama || ''
  formData.value.nomorIndukMahasiswa = data?.nomorIndukMahasiswa || ''
  formData.value.programStudi = data.programStudi || ''
  formData.value.fakultas = data.fakultas || ''

  // Convert tahunDiterima to string
  formData.value.tahunDiterima = data.tahunDiterima || ''

  // Convert tanggalLulus to ISO format
  formData.value.tanggalLulus =
    convertIndonesianDateToISO(data.tanggalLulus) || ''

  // Fill other fields from data if available
  if (data.tempatLahir && data.tempatLahir !== 'NULL') {
    formData.value.tempatLahir = data.tempatLahir
  }

  if (data.tanggalLahir && data.tanggalLahir !== 'NULL') {
    formData.value.tanggalLahir = convertDateTimeToISO(data.tanggalLahir)
  }

  if (data.nomorIndukKependudukan) {
    formData.value.nomorIndukKependudukan = data.nomorIndukKependudukan
  }

  if (data.jenisPendidikan) {
    formData.value.jenisPendidikan = data.jenisPendidikan
  }

  if (data.gelarPendidikan) {
    formData.value.gelarPendidikan = data.gelarPendidikan
  }

  if (data.akreditasiProgramStudi) {
    formData.value.akreditasiProgramStudi = data.akreditasiProgramStudi
  }

  if (data.keputusanAkreditasiProgramStudi) {
    formData.value.keputusanAkreditasiProgramStudi =
      data.keputusanAkreditasiProgramStudi
  }

  if (data.tempatIjazahDiberikan) {
    formData.value.tempatIjazahDiberikan = data.tempatIjazahDiberikan
  }

  if (data.tanggalIjazahDiberikan && data.tanggalIjazahDiberikan !== 'NULL') {
    formData.value.tanggalIjazahDiberikan = convertDateTimeToISO(
      data.tanggalIjazahDiberikan
    )
  }
}

const onPhotoChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (!target || !target.files || target.files.length === 0) {
    console.error('No file selected')
    return
  }

  photoFile.value = target.files[0]
}

const resetForm = () => {
  if (form.value) {
    form.value.reset()
  }

  // Reset search
  nimSearch.value = ''
  searchError.value = ''
  mahasiswaData.value = null
  currentStep.value = 1

  // Reset form data
  formData.value = {
    nomorDokumen: '',
    nomorIjazahNasional: '',
    nama: '',
    tempatLahir: '',
    tanggalLahir: '',
    nomorIndukKependudukan: '',
    programStudi: '',
    fakultas: '',
    tahunDiterima: '',
    nomorIndukMahasiswa: '',
    tanggalLulus: '',
    jenisPendidikan: '',
    gelarPendidikan: '',
    akreditasiProgramStudi: '',
    keputusanAkreditasiProgramStudi: '',
    tempatIjazahDiberikan: '',
    tanggalIjazahDiberikan: '',
    ipfsCID: '',
    signatureID: '',
    photoCID: '',
  }

  photoFile.value = null
  valid.value = false
}

const closeDialog = () => {
  dialog.value = false
}

const submitForm = async () => {
  if (!form.value.validate()) {
    return
  }

  loading.value = true

  try {
    // Prepare data sesuai interface IjazahInput
    const ijazahData: IjazahInput = {
      nomorDokumen: formData.value.nomorDokumen,
      nomorIjazahNasional: formData.value.nomorIjazahNasional,
      nama: formData.value.nama,
      tanggalLahir: formData.value.tanggalLahir,
      nomorIndukKependudukan: formData.value.nomorIndukKependudukan,
      programStudi: formData.value.programStudi,
      fakultas: formData.value.fakultas,
      tahunDiterima: formData.value.tahunDiterima,
      nomorIndukMahasiswa: formData.value.nomorIndukMahasiswa,
      tanggalLulus: formData.value.tanggalLulus,
      jenisPendidikan: formData.value.jenisPendidikan,
      gelarPendidikan: formData.value.gelarPendidikan,
      akreditasiProgramStudi: formData.value.akreditasiProgramStudi,
      keputusanAkreditasiProgramStudi:
        formData.value.keputusanAkreditasiProgramStudi,
      tempatIjazahDiberikan: formData.value.tempatIjazahDiberikan,
      tanggalIjazahDiberikan: formData.value.tanggalIjazahDiberikan,
    }

    // Add optional fields only if they have values
    if (formData.value.tempatLahir) {
      ijazahData.tempatLahir = formData.value.tempatLahir
    }

    if (formData.value.ipfsCID) {
      ijazahData.ipfsCID = formData.value.ipfsCID
    }

    if (formData.value.signatureID) {
      ijazahData.signatureID = formData.value.signatureID
    }

    if (formData.value.photoCID) {
      ijazahData.photoCID = formData.value.photoCID
    }

    // Prepare form data for multipart upload if there's a photo
    let submitData: FormData

    if (photoFile.value) {
      submitData = new FormData()

      // Add all ijazah data as JSON string or individual fields
      Object.entries(ijazahData).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          submitData.append(key, value)
        }
      })

      // Add photo file
      submitData.append('photo', photoFile.value)
    } else {
      // Send as JSON if no photo
      submitData = new FormData()
      submitData.append('ijazahData', JSON.stringify(ijazahData))
    }

    // Call API to create ijazah
    const response = photoFile.value
      ? await apiService.post('/api/ijazah', submitData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      : await apiService.post('/api/ijazah', submitData, {
          headers: {
            'Content-Type': 'application/json',
          },
        })

    if (apiHelper.isSuccess(response)) {
      emit('success', 'Pengajuan ijazah berhasil dibuat')
      closeDialog()
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    const errorMessage = apiHelper.getErrorMessage(error as ApiError)
    emit('error', errorMessage)
    console.error('Error creating ijazah:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.v-card-subtitle {
  padding-top: 12px !important;
  padding-bottom: 8px !important;
}

.v-card-text {
  padding-top: 8px !important;
}

/* Custom styling for form sections */
.v-card.v-card--outlined {
  border: 1px solid #e0e0e0 !important;
}

/* Readonly fields styling */
.v-text-field--readonly {
  opacity: 0.8;
}

/* Success card styling */
.v-card.success {
  border: 2px solid #4caf50 !important;
}

/* Stepper styling */
.v-stepper {
  box-shadow: none !important;
}

.v-stepper__header {
  box-shadow: none !important;
  border-bottom: 1px solid #e0e0e0;
}

/* Alert styling adjustments */
.v-alert {
  margin-top: 16px;
  margin-bottom: 0;
}

/* Step content padding */
.v-stepper-content {
  padding: 24px !important;
}
</style>
