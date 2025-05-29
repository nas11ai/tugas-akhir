<!-- Modal Form Edit Ijazah -->
<template>
  <v-dialog v-model="dialog" max-width="800px" persistent>
    <v-card>
      <v-card-title class="text-h5 orange white--text">
        <v-icon left color="white">mdi-pencil</v-icon>
        Edit Pengajuan Ijazah
      </v-card-title>

      <v-divider></v-divider>

      <v-card-text class="pa-6">
        <v-form ref="form" v-model="valid" lazy-validation>
          <v-row>
            <!-- Data Dokumen -->
            <v-col cols="12">
              <v-card outlined class="mb-4">
                <v-card-subtitle class="orange--text font-weight-bold">
                  <v-icon left color="orange">mdi-file-document</v-icon>
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

            <!-- Data Mahasiswa -->
            <v-col cols="12">
              <v-card outlined class="mb-4">
                <v-card-subtitle class="orange--text font-weight-bold">
                  <v-icon left color="orange">mdi-account</v-icon>
                  Data Mahasiswa
                </v-card-subtitle>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.nama"
                        label="Nama Lengkap"
                        :rules="requiredRules"
                        outlined
                        dense
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.tempatLahir"
                        label="Tempat Lahir"
                        outlined
                        dense
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
                      <v-text-field
                        v-model="formData.nomorIndukMahasiswa"
                        label="NIM"
                        :rules="requiredRules"
                        outlined
                        dense
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-file-input
                        v-model="photoFile"
                        label="Foto Mahasiswa (Opsional - kosongkan jika tidak ingin mengubah)"
                        prepend-icon="mdi-camera"
                        accept="image/png"
                        :rules="photoRules"
                        outlined
                        dense
                        show-size
                        clearable
                        @change="onPhotoChange"
                      >
                        <template v-slot:selection="{ fileNames }">
                          <v-chip small label color="orange">
                            {{ fileNames.join(', ') }}
                          </v-chip>
                        </template>
                      </v-file-input>
                      <v-alert
                        v-if="hasExistingPhoto"
                        type="info"
                        dense
                        outlined
                        class="mt-2"
                      >
                        <small
                          >Foto saat ini tersedia. Upload foto baru jika ingin
                          mengubah.</small
                        >
                      </v-alert>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Data Akademik -->
            <v-col cols="12">
              <v-card outlined class="mb-4">
                <v-card-subtitle class="orange--text font-weight-bold">
                  <v-icon left color="orange">mdi-school</v-icon>
                  Data Akademik
                </v-card-subtitle>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.programStudi"
                        label="Program Studi"
                        :rules="requiredRules"
                        outlined
                        dense
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.fakultas"
                        label="Fakultas"
                        :rules="requiredRules"
                        outlined
                        dense
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.tahunDiterima"
                        label="Tahun Diterima"
                        type="number"
                        :rules="[...requiredRules, ...yearRules]"
                        outlined
                        dense
                        required
                      ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model="formData.tanggalLulus"
                        label="Tanggal Lulus"
                        type="date"
                        :rules="requiredRules"
                        outlined
                        dense
                        required
                      ></v-text-field>
                    </v-col>
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
                <v-card-subtitle class="orange--text font-weight-bold">
                  <v-icon left color="orange">mdi-medal</v-icon>
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
                <v-card-subtitle class="orange--text font-weight-bold">
                  <v-icon left color="orange">mdi-calendar-check</v-icon>
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
          </v-row>
        </v-form>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions class="pa-4">
        <v-spacer></v-spacer>
        <v-btn color="grey" outlined @click="closeDialog" :disabled="loading">
          <v-icon left>mdi-close</v-icon>
          Batal
        </v-btn>
        <v-btn
          color="orange"
          @click="submitForm"
          :loading="loading"
          :disabled="!valid"
        >
          <v-icon left>mdi-content-save</v-icon>
          Update
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts" setup>
import { ref, watch, defineEmits, defineProps, computed } from 'vue'
import { apiService, apiHelper, type ApiError } from '@/config/axios'
import type { Ijazah } from '@/config/ijazah'

// Props & Emits
const props = defineProps<{
  modelValue: boolean
  editData: Ijazah | null
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
const form = ref()
const photoFile = ref<File | null>(null)

// Computed property to check if there's existing photo
const hasExistingPhoto = computed(() => {
  return props.editData?.photoCID || false
})

// Form data interface
interface IjazahFormData {
  nomorDokumen: string
  nomorIjazahNasional: string
  nama: string
  tempatLahir: string
  tanggalLahir: string
  nomorIndukKependudukan: string
  programStudi: string
  fakultas: string
  tahunDiterima: string
  nomorIndukMahasiswa: string
  tanggalLulus: string
  jenisPendidikan: string
  gelarPendidikan: string
  akreditasiProgramStudi: string
  keputusanAkreditasiProgramStudi: string
  tempatIjazahDiberikan: string
  tanggalIjazahDiberikan: string
}

// Form data
const formData = ref<IjazahFormData>({
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
const jenisPendidikanOptions = ['S1', 'S2', 'S3', 'D3', 'D4']

const akreditasiOptions = ['A', 'B', 'C']

// Validation rules
const requiredRules = [(v: string) => !!v || 'Field ini wajib diisi']

const nikRules = [
  (v: string) => /^\d{16}$/.test(v) || 'NIK harus 16 digit angka',
]

const yearRules = [
  (v: string) => {
    const year = parseInt(v)
    const currentYear = new Date().getFullYear()
    return (year >= 1900 && year <= currentYear) || 'Tahun tidak valid'
  },
]

// Photo rules for edit - make it optional
const photoRules = [
  (v: File[] | File | null) => {
    if (!v) return true // Photo is optional for edit

    const file = Array.isArray(v) ? v[0] : v
    if (!file) return true

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return 'Ukuran file maksimal 5MB'
    }

    return true
  },
]

// Helper function to format date for input[type="date"]
const formatDateForInput = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

// Watch for dialog changes
watch(
  () => props.modelValue,
  (newVal) => {
    dialog.value = newVal
    if (newVal && props.editData) {
      populateForm()
    }
  }
)

watch(dialog, (newVal) => {
  emit('update:modelValue', newVal)
  if (!newVal) {
    resetForm()
  }
})

// Methods
const populateForm = () => {
  if (!props.editData) return

  const data = props.editData
  formData.value = {
    nomorDokumen: data.nomorDokumen || '',
    nomorIjazahNasional: data.nomorIjazahNasional || '',
    nama: data.nama || '',
    tempatLahir: data.tempatLahir || '',
    tanggalLahir: formatDateForInput(data.tanggalLahir || ''),
    nomorIndukKependudukan: data.nomorIndukKependudukan || '',
    programStudi: data.programStudi || '',
    fakultas: data.fakultas || '',
    tahunDiterima: data.tahunDiterima?.toString() || '',
    nomorIndukMahasiswa: data.nomorIndukMahasiswa || '',
    tanggalLulus: formatDateForInput(data.tanggalLulus || ''),
    jenisPendidikan: data.jenisPendidikan || '',
    gelarPendidikan: data.gelarPendidikan || '',
    akreditasiProgramStudi: data.akreditasiProgramStudi || '',
    keputusanAkreditasiProgramStudi: data.keputusanAkreditasiProgramStudi || '',
    tempatIjazahDiberikan: data.tempatIjazahDiberikan || '',
    tanggalIjazahDiberikan: formatDateForInput(
      data.tanggalIjazahDiberikan || ''
    ),
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
  }
  photoFile.value = null
  valid.value = false
}

const closeDialog = () => {
  dialog.value = false
}

const submitForm = async () => {
  if (!form.value.validate() || !props.editData) {
    return
  }

  loading.value = true

  try {
    // Prepare form data for multipart upload
    const submitData = new FormData()

    // Add all form fields
    Object.entries(formData.value).forEach(([key, value]) => {
      if (value) {
        submitData.append(key, value)
      }
    })

    // Add photo file if present (optional for edit)
    if (photoFile.value) {
      submitData.append('photo', photoFile.value)
    }

    // Call API to update ijazah
    const response = await apiService.ijazah.update(
      props.editData.ID || props.editData.ID || '',
      submitData
    )

    if (apiHelper.isSuccess(response)) {
      emit('success', 'Ijazah berhasil diupdate')
      closeDialog()
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    const errorMessage = apiHelper.getErrorMessage(error as ApiError)
    emit('error', errorMessage)
    console.error('Error updating ijazah:', error)
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

/* Ensure proper spacing */
.v-text-field.v-text-field--outlined.v-input--dense
  > .v-input__control
  > .v-input__slot {
  min-height: 40px;
}

/* File input styling */
.v-file-input .v-file-input__text {
  color: rgba(0, 0, 0, 0.87);
}
</style>
