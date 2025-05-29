<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <v-container fluid class="mt-4">
      <!-- Loading State -->
      <div v-if="loading" class="text-center my-8">
        <v-progress-circular
          indeterminate
          color="primary"
          size="64"
        ></v-progress-circular>
        <p class="mt-4">Memuat data ijazah...</p>
      </div>

      <!-- Error State -->
      <v-alert
        v-if="error"
        type="error"
        class="my-4"
        dismissible
        @click:close="error = null"
      >
        {{ error }}
      </v-alert>

      <!-- Main Content -->
      <div v-if="!loading && !error && ijazah">
        <!-- Certificate Display -->
        <v-row class="">
          <v-col cols="12">
            <v-sheet class="pa-4" outlined>
              <!-- Tombol Kembali -->
              <v-btn color="blue" outlined @click="goBack" class="mb-4">
                <v-icon left>mdi-arrow-left</v-icon>
                Kembali
              </v-btn>
              <v-card-title class="text-center">
                <h3>Sertifikat Ijazah</h3>
              </v-card-title>

              <!-- Certificate Image -->
              <div v-if="certificateUrl" class="text-center">
                <v-img
                  :src="certificateUrl"
                  :alt="`Sertifikat ${ijazah.nama}`"
                  aspect-ratio="16/9"
                  cover
                  class="w-100"
                  max-height="500"
                  @error="onImageError"
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

                <v-btn
                  color="primary"
                  class="mt-3"
                  @click="downloadCertificate"
                >
                  <v-icon left>mdi-download</v-icon>
                  Download Sertifikat
                </v-btn>
              </div>

              <!-- Placeholder if no certificate -->
              <div v-else class="text-center pa-8">
                <v-icon size="100" color="grey lighten-2"
                  >mdi-certificate</v-icon
                >
                <p class="mt-4 grey--text">Sertifikat belum tersedia</p>
              </div>
            </v-sheet>
          </v-col>
        </v-row>

        <!-- Student Info and Details -->
        <v-row>
          <v-col cols="12" class="text-center mt-8">
            <h3 class="font-weight-bold">Detail Sertifikat Ijazah</h3>
            <v-divider class="mt-4"></v-divider>
          </v-col>
        </v-row>

        <!-- Student Photo and Basic Info -->
        <v-row class="mt-4">
          <v-col cols="12" md="4">
            <v-card outlined class="pa-4 text-center">
              <v-card-title class="justify-center">
                <h4>Foto Mahasiswa</h4>
              </v-card-title>
              <div v-if="photoUrl">
                <v-avatar size="150" class="mb-3">
                  <v-img
                    :src="photoUrl"
                    :alt="`Foto ${ijazah.nama}`"
                    @error="onPhotoError"
                  ></v-img>
                </v-avatar>
              </div>
              <div v-else>
                <v-avatar size="150" color="grey lighten-2" class="mb-3">
                  <v-icon size="80" color="grey darken-1">mdi-account</v-icon>
                </v-avatar>
              </div>
              <h3 class="font-weight-bold">{{ ijazah.nama }}</h3>
              <p class="text-subtitle-1">{{ ijazah.nomorIndukMahasiswa }}</p>
            </v-card>
          </v-col>

          <v-col cols="12" md="8">
            <v-row>
              <!-- Personal Information -->
              <v-col cols="12" sm="6">
                <v-card outlined class="pa-4 h-100">
                  <v-card-title class="text-uppercase font-weight-bold pb-2">
                    <v-icon left color="primary">mdi-account-details</v-icon>
                    Data Pribadi
                  </v-card-title>
                  <v-card-text>
                    <div class="mb-2">
                      <strong>NIK:</strong> {{ ijazah.nomorIndukKependudukan }}
                    </div>
                    <div class="mb-2">
                      <strong>Tempat Lahir:</strong>
                      {{ ijazah.tempatLahir || '-' }}
                    </div>
                    <div class="mb-2">
                      <strong>Tanggal Lahir:</strong>
                      {{ formatDate(ijazah.tanggalLahir) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>

              <!-- Academic Information -->
              <v-col cols="12" sm="6">
                <v-card outlined class="pa-4 h-100">
                  <v-card-title class="text-uppercase font-weight-bold pb-2">
                    <v-icon left color="success">mdi-school</v-icon>
                    Data Akademik
                  </v-card-title>
                  <v-card-text>
                    <div class="mb-2">
                      <strong>Program Studi:</strong> {{ ijazah.programStudi }}
                    </div>
                    <div class="mb-2">
                      <strong>Fakultas:</strong> {{ ijazah.fakultas }}
                    </div>
                    <div class="mb-2">
                      <strong>Jenis Pendidikan:</strong>
                      {{ ijazah.jenisPendidikan }}
                    </div>
                    <div class="mb-2">
                      <strong>Gelar:</strong> {{ ijazah.gelarPendidikan }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </v-col>
        </v-row>

        <!-- Document Information -->
        <v-row class="mt-4">
          <v-col cols="12" md="6">
            <v-card outlined class="pa-4">
              <v-card-title class="text-uppercase font-weight-bold pb-2">
                <v-icon left color="info">mdi-file-document</v-icon>
                Informasi Dokumen
              </v-card-title>
              <v-card-text>
                <div class="mb-2">
                  <strong>Nomor Dokumen:</strong> {{ ijazah.nomorDokumen }}
                </div>
                <div class="mb-2">
                  <strong>Nomor Ijazah Nasional:</strong>
                  {{ ijazah.nomorIjazahNasional }}
                </div>
                <div class="mb-2">
                  <strong>Tempat Diberikan:</strong>
                  {{ ijazah.tempatIjazahDiberikan }}
                </div>
                <div class="mb-2">
                  <strong>Tanggal Diberikan:</strong>
                  {{ formatDate(ijazah.tanggalIjazahDiberikan) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="6">
            <v-card outlined class="pa-4">
              <v-card-title class="text-uppercase font-weight-bold pb-2">
                <v-icon left color="warning">mdi-calendar-clock</v-icon>
                Timeline Akademik
              </v-card-title>
              <v-card-text>
                <div class="mb-2">
                  <strong>Tahun Diterima:</strong> {{ ijazah.tahunDiterima }}
                </div>
                <div class="mb-2">
                  <strong>Tanggal Lulus:</strong>
                  {{ formatDate(ijazah.tanggalLulus) }}
                </div>
                <div class="mb-2">
                  <strong>Akreditasi:</strong>
                  {{ ijazah.akreditasiProgramStudi }}
                </div>
                <div class="mb-2">
                  <strong>Keputusan Akreditasi:</strong>
                  {{ ijazah.keputusanAkreditasiProgramStudi }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <!-- Actions -->
        <v-row class="mt-6">
          <v-col cols="12" class="text-center">
            <v-btn
              color="success"
              large
              @click="validateCertificate"
              :loading="validating"
              class="mr-4"
            >
              <v-icon left>mdi-shield-check</v-icon>
              Validasi Sertifikat
            </v-btn>

            <v-btn
              color="primary"
              large
              @click="verifyCertificate"
              :loading="verifying"
            >
              <v-icon left>mdi-certificate-outline</v-icon>
              Verifikasi Sertifikat
            </v-btn>
          </v-col>
        </v-row>

        <!-- Validation/Verification Results -->
        <v-row v-if="validationResult || verificationResult" class="mt-4">
          <v-col cols="12">
            <v-alert
              v-if="validationResult"
              :type="validationResult.isValid ? 'success' : 'error'"
              class="mb-4"
            >
              <strong>Hasil Validasi:</strong> {{ validationResult.message }}
            </v-alert>

            <v-alert
              v-if="verificationResult"
              :type="verificationResult.isVerified ? 'success' : 'warning'"
            >
              <strong>Hasil Verifikasi:</strong>
              {{ verificationResult.message }}
            </v-alert>
          </v-col>
        </v-row>
      </div>

      <!-- Not Found State -->
      <div v-if="!loading && !error && !ijazah" class="text-center my-8">
        <v-icon size="100" color="grey lighten-2"
          >mdi-file-document-remove</v-icon
        >
        <h3 class="mt-4 grey--text">Ijazah tidak ditemukan</h3>
        <p class="grey--text">
          ID yang Anda cari tidak valid atau ijazah telah dihapus.
        </p>
        <v-btn color="primary" @click="goBack" class="mt-4">
          Kembali ke Pencarian
        </v-btn>
      </div>
    </v-container>
  </BaseLayout>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import BaseLayout from '@/layouts/BaseLayout.vue'
import { apiService, apiHelper } from '@/config/axios'
import type { Ijazah } from '@/config/ijazah'

// Composables
const route = useRoute()
const router = useRouter()

// Get ID from route params - this works with [id].vue file structure
const ijazahId = computed(() => route.params.id as string)

// Reactive data
const ijazah = ref<Ijazah | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const validating = ref(false)
const verifying = ref(false)
const validationResult = ref<{ isValid: boolean; message: string } | null>(null)
const verificationResult = ref<{ isVerified: boolean; message: string } | null>(
  null
)

// Computed properties
const certificateUrl = computed(() => {
  if (ijazah.value?.ipfsCID) {
    return `${import.meta.env.VITE_API_BASE_URL}/ipfs/${ijazah.value.ipfsCID}`
  }
  return null
})

const photoUrl = computed(() => {
  if (ijazah.value?.photoCID) {
    return `${import.meta.env.VITE_API_BASE_URL}/ipfs/${ijazah.value.photoCID}`
  }
  return null
})

// Methods
const fetchIjazah = async () => {
  if (!ijazahId.value) {
    error.value = 'ID Ijazah tidak valid'
    return
  }

  loading.value = true
  error.value = null

  try {
    // Try public endpoint first, fallback to authenticated endpoint
    let response
    try {
      response = await apiService.ijazah.getPublic(ijazahId.value)
    } catch (publicError) {
      // If public fails, try authenticated endpoint
      console.error('Error fetching public ijazah:', publicError)
      response = await apiService.ijazah.getById(ijazahId.value)
    }

    if (response.data) {
      ijazah.value = response.data.data
    } else {
      error.value = 'Data ijazah tidak ditemukan'
    }
  } catch (err) {
    console.error('Error fetching ijazah:', err)
    error.value = apiHelper.getErrorMessage(err as Error)
  } finally {
    loading.value = false
  }
}

const validateCertificate = async () => {
  if (!ijazah.value) return

  validating.value = true
  validationResult.value = null

  try {
    const response = await apiService.ijazah.validate(ijazah.value.ID)
    validationResult.value = {
      isValid: response.data?.valid || false,
      message: response.data?.message || 'Sertifikat berhasil divalidasi',
    }
  } catch (err) {
    console.error('Error validating certificate:', err)
    validationResult.value = {
      isValid: false,
      message: apiHelper.getErrorMessage(err as Error),
    }
  } finally {
    validating.value = false
  }
}

const verifyCertificate = async () => {
  if (!ijazah.value) return

  verifying.value = true
  verificationResult.value = null

  try {
    const response = await apiService.ijazah.verify(ijazah.value.ID)
    verificationResult.value = {
      isVerified: response.data?.verified || false,
      message: response.data?.message || 'Sertifikat berhasil diverifikasi',
    }
  } catch (err) {
    console.error('Error verifying certificate:', err)
    verificationResult.value = {
      isVerified: false,
      message: apiHelper.getErrorMessage(err as Error),
    }
  } finally {
    verifying.value = false
  }
}

const downloadCertificate = async () => {
  if (!ijazah.value || !certificateUrl.value) return

  try {
    const response = await apiService.ijazah.getCertificateUrl(ijazah.value.ID)
    const downloadUrl = response.data?.url || certificateUrl.value

    // Create download link
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = `Ijazah_${ijazah.value.nama}_${ijazah.value.nomorDokumen}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (err) {
    console.error('Error downloading certificate:', err)
    // Fallback to direct IPFS link
    if (certificateUrl.value) {
      window.open(certificateUrl.value, '_blank')
    }
  }
}

const formatDate = (dateString: string): string => {
  if (!dateString) return '-'

  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

const onImageError = () => {
  console.warn('Failed to load certificate image')
}

const onPhotoError = () => {
  console.warn('Failed to load student photo')
}

const goBack = () => {
  router.push('/akademik')
}

// Watch for route changes (useful if navigating between different IDs)
watch(
  () => route.params.id,
  (newId) => {
    if (newId && newId !== ijazah.value?.ID) {
      fetchIjazah()
    }
  },
  { immediate: false }
)

// Lifecycle
onMounted(() => {
  fetchIjazah()
})
</script>

<style scoped>
.v-card-title {
  word-break: normal;
}

.h-100 {
  height: 100%;
}

.v-avatar img {
  object-fit: cover;
}
</style>
