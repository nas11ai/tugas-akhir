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
            title="Cari Mahasiswa"
            :complete="+currentStep > 1"
            value="1"
            color="primary"
          ></v-stepper-item>

          <v-divider></v-divider>

          <v-stepper-item
            title="Lengkapi Data Ijazah"
            :complete="+currentStep > 2"
            value="2"
            color="primary"
            :disabled="!mahasiswaData"
          ></v-stepper-item>
        </v-stepper-header>

        <v-stepper-window v-model="currentStep">
          <!-- Step 1: Pencarian Mahasiswa -->
          <v-stepper-window-item value="1">
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

            <div class="d-flex justify-space-between pa-4">
              <v-btn color="grey" outlined @click="closeDialog">
                <v-icon left>mdi-close</v-icon>
                Batal
              </v-btn>
              <v-btn
                color="primary"
                @click="goToStep(2)"
                :disabled="!mahasiswaData"
              >
                Lanjutkan
                <v-icon right>mdi-arrow-right</v-icon>
              </v-btn>
            </div>
          </v-stepper-window-item>

          <!-- Step 2: Form Data Ijazah -->
          <v-stepper-window-item value="2">
            <v-form ref="form" v-model="valid" lazy-validation>
              <v-row>
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
                          <v-file-input
                            v-model="photoFile"
                            label="Foto Mahasiswa *"
                            prepend-icon="mdi-camera"
                            accept="image/png,image/jpeg,image/jpg"
                            :rules="photoRules"
                            outlined
                            dense
                            show-size
                            clearable
                            required
                            @change="onPhotoChange"
                            @click:clear="onPhotoClear"
                          >
                            <template v-slot:selection="{ fileNames }">
                              <v-chip small label color="primary">
                                <v-icon left small>mdi-file-image</v-icon>
                                {{ fileNames.join(', ') }}
                              </v-chip>
                            </template>
                          </v-file-input>

                          <!-- Preview foto yang diupload -->
                          <div v-if="photoPreview" class="mt-2">
                            <v-img
                              :src="photoPreview"
                              max-height="150"
                              max-width="150"
                              class="rounded"
                            >
                              <template v-slot:placeholder>
                                <v-row
                                  class="fill-height ma-0"
                                  align="center"
                                  justify="center"
                                >
                                  <v-progress-circular
                                    indeterminate
                                    color="grey lighten-5"
                                  ></v-progress-circular>
                                </v-row>
                              </template>
                            </v-img>
                            <div class="caption mt-1 grey--text">
                              Preview foto mahasiswa
                            </div>
                          </div>

                          <!-- Alert jika foto belum diupload -->
                          <v-alert
                            v-if="!photoFile"
                            type="warning"
                            outlined
                            dense
                            class="mt-2"
                          >
                            <v-icon left small>mdi-alert</v-icon>
                            Foto mahasiswa wajib diupload untuk melengkapi
                            pengajuan ijazah
                          </v-alert>
                        </v-col>
                      </v-row>
                    </v-card-text>
                  </v-card>
                </v-col>
              </v-row>
            </v-form>

            <div class="d-flex justify-space-between pa-4">
              <v-btn color="grey" outlined @click="goToStep(1)">
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
                  :disabled="!valid || !photoFile"
                >
                  <v-icon left>mdi-content-save</v-icon>
                  Simpan Ijazah
                </v-btn>
              </div>
            </div>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, defineEmits, defineProps, onUnmounted } from 'vue'
import { apiService, apiHelper, type ApiError } from '@/config/axios'
import { type IjazahInput } from '@/config/ijazah'

// Define types for better type safety
interface MahasiswaSearchResponse {
  nama: string
  nomorIndukMahasiswa: string
  programStudi: string
  fakultas: string
  tahunDiterima: string
  tanggalLulus: string
  tempatLahir?: string
  tanggalLahir?: string
  nomorIndukKependudukan?: string
  jenisPendidikan?: string
  gelarPendidikan?: string
  akreditasiProgramStudi?: string
  keputusanAkreditasiProgramStudi?: string
  tempatIjazahDiberikan?: string
  tanggalIjazahDiberikan?: string
  nomorIjazahNasional?: string
  nomorDokumen?: string
}

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
const photoPreview = ref<string>('')
const currentStep = ref('1') // String untuk konsistensi dengan v-stepper

// Search data
const nimSearch = ref('')
const searchError = ref('')
const mahasiswaData = ref<MahasiswaSearchResponse | null>(null)

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
  ipfsCID: '',
  signatureID: '',
  Status: '',
  photoCID: undefined
})

const nimRules = [
  (v: string) => !!v || 'NIM wajib diisi',
  (v: string) => v.length >= 5 || 'NIM minimal 5 karakter',
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

    // Check file type
    const allowedTypes = ['image/png']
    if (!allowedTypes.includes(file.type)) {
      return 'Format file harus PNG atau JPEG'
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

const convertIndonesianDateToISO = (indonesianDate: string | null): string => {
  if (!indonesianDate || indonesianDate.trim().toUpperCase() === 'NULL') {
    const today = new Date()
    return today.toISOString().split('T')[0] // return tanggal hari ini
  }

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

  // Parse format "27 Juni 2024"
  const parts = indonesianDate.trim().split(' ')
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0')
    const month = monthMap[parts[1]]
    const year = parts[2]

    if (month) {
      return `${year}-${month}-${day}`
    }
  }

  // If it's already a valid date
  const date = new Date(indonesianDate)
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0]
  }

  // Jika semua gagal, fallback ke hari ini juga (opsional)
  return new Date().toISOString().split('T')[0]
}

const convertDateTimeToISO = (dateTimeString?: string | null): string => {
  if (!dateTimeString || dateTimeString.trim().toUpperCase() === 'NULL') {
    return new Date().toISOString()
  }

  const date = new Date(dateTimeString)
  if (!isNaN(date.getTime())) {
    return date.toISOString()
  }

  return new Date().toISOString()
}

const getYearFromDateString = (dateString?: string | null): string => {
  if (!dateString || dateString.trim().toUpperCase() === 'NULL') {
    return new Date().getFullYear().toString()
  }

  const date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    return date.getFullYear().toString()
  }

  // Kalau gagal parse, return tahun sekarang juga
  return new Date().getFullYear().toString()
}

// Navigation methods
const goToStep = (step: number) => {
  currentStep.value = step.toString()
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
      console.log(response)
      mahasiswaData.value = response.data.data

      if (!mahasiswaData.value) {
        searchError.value = `Mahasiswa dengan NIM "${nimSearch.value}" tidak ditemukan di database. Pastikan NIM yang dimasukkan benar.`
        return
      }

      // Pre-fill form data dengan data mahasiswa
      fillFormWithMahasiswaData(mahasiswaData.value)
      console.log(mahasiswaData.value.nomorIndukMahasiswa)

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

const fillFormWithMahasiswaData = (data: MahasiswaSearchResponse) => {
  formData.value.nama = data.nama || ''
  formData.value.nomorIndukMahasiswa = data.nomorIndukMahasiswa || ''
  formData.value.programStudi = data.programStudi || ''
  formData.value.fakultas = data.fakultas || ''

  // Convert tahunDiterima to string
  formData.value.tahunDiterima = getYearFromDateString(data.tahunDiterima)

  // Convert tanggalLulus to ISO format
  formData.value.tanggalLulus = convertIndonesianDateToISO(data.tanggalLulus)

  formData.value.nomorDokumen = data.nomorDokumen || ''
  formData.value.nomorIjazahNasional = data.nomorIjazahNasional || ''

  formData.value.tempatLahir = data.tempatLahir || '-'

  formData.value.tanggalLahir = convertDateTimeToISO(data.tanggalLahir)

  formData.value.nomorIndukKependudukan = data.nomorIndukKependudukan || '-'

  formData.value.jenisPendidikan = data.jenisPendidikan || '-'

  formData.value.gelarPendidikan = data.gelarPendidikan || '-'

  formData.value.akreditasiProgramStudi = data.akreditasiProgramStudi || '-'

  formData.value.keputusanAkreditasiProgramStudi =
    data.keputusanAkreditasiProgramStudi || ''

  formData.value.tempatIjazahDiberikan = data.tempatIjazahDiberikan || '-'

  formData.value.tanggalIjazahDiberikan = convertDateTimeToISO(
    data.tanggalIjazahDiberikan
  )

  console.log('formData:', { ...formData.value })
}

function onPhotoChange() {
  if (!photoFile.value) {
    console.error('File tidak valid atau tidak dipilih.')
    return
  }

  const file = photoFile.value

  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
  if (!allowedTypes.includes(file.type)) {
    console.error('Jenis file tidak didukung:', file.type)
    return
  }

  // Optionally: Validasi ukuran
  const maxSizeMB = 2
  const sizeMB = file.size / 1024 / 1024
  if (sizeMB > maxSizeMB) {
    console.error('Ukuran file terlalu besar:', sizeMB, 'MB')
    return
  }

  console.log('File diterima:', file.name)
}

const onPhotoClear = () => {
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
  }
  photoFile.value = null
}

const resetForm = () => {
  if (form.value) {
    form.value.reset()
  }

  // Reset search
  nimSearch.value = ''
  searchError.value = ''
  mahasiswaData.value = null
  currentStep.value = '1'

  // Reset photo
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
    photoPreview.value = ''
  }
  photoFile.value = null

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
    Status: '',
  }

  valid.value = false
}

const closeDialog = () => {
  dialog.value = false
}

// Cleanup URL objects when component unmounts
onUnmounted(() => {
  if (photoPreview.value) {
    URL.revokeObjectURL(photoPreview.value)
  }
})

const submitForm = async () => {
  if (!form.value.validate()) {
    return
  }

  // Validate photo is required
  if (!photoFile.value) {
    emit('error', 'Foto mahasiswa wajib diupload sebelum menyimpan ijazah')
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
      keputusanAkreditasiProgramStudi: formData.value.keputusanAkreditasiProgramStudi,
      tempatIjazahDiberikan: formData.value.tempatIjazahDiberikan,
      tanggalIjazahDiberikan: formData.value.tanggalIjazahDiberikan,
      Status: '',
      photoCID: undefined
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

    // Always submit with photo (multipart form data) since photo is required
    const formDataToSubmit = new FormData()

    // Add all ijazah data as individual fields
    Object.entries(ijazahData).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        formDataToSubmit.append(key, value.toString())
      }
    })

    // Add photo file (required)
    formDataToSubmit.append('photo', photoFile.value, photoFile.value.name)

    // Call API to create ijazah
    const response = await apiService.post('/api/ijazah', formDataToSubmit, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
.v-stepper-window-item {
  padding: 24px !important;
}
</style>
