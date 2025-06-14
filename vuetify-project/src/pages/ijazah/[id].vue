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
        <v-btn color="secondary" outlined @click="goBack" class="mb-4">
          <v-icon left>mdi-arrow-left</v-icon>
          Kembali
        </v-btn>
        <v-card class="pa-4 d-flex flex-row ga-4 justify-space-evenly">
          <div class="pa-4 d-flex flex-column align-center ga-4">
            <v-card-title class="text-center">
              <h3>Sertifikat Ijazah</h3>
            </v-card-title>
            <!-- Photo Display -->
            <div class="d-flex flex-column align-center justify-center">
              <div v-if="photoUrl">
                <v-avatar rounded="0" size="150" class="mb-3">
                  <v-img
                    :src="photoUrl"
                    :alt="`Foto ${ijazah.nama}`"
                    @error="onPhotoError"
                    cover
                  ></v-img>
                </v-avatar>
              </div>
              <div v-else>
                <v-avatar size="150" color="grey lighten-2" class="mb-3">
                  <v-icon size="80" color="grey darken-1">mdi-account</v-icon>
                </v-avatar>
              </div>
              <!-- Name and NIM -->
              <h3 class="font-weight-bold">{{ ijazah.nama }}</h3>
              <p class="text-subtitle-1">
                NIM: {{ ijazah.nomorIndukMahasiswa }}
              </p>
            </div>
            <!-- Download Button  -->
            <div v-if="certificateUrl">
              <v-btn class="mb-4" color="primary" @click="downloadCertificate">
                <v-icon left>mdi-download</v-icon>
                Download Sertifikat
              </v-btn>
            </div>
          </div>

          <v-divider vertical class="mx-4"></v-divider>

          <!-- Personal Information -->
          <div class="pa-4 d-flex flex-column ga-4">
            <v-card-title class="text-uppercase font-weight-bold pb-2">
              <v-icon left color="primary">mdi-account-details</v-icon>
              Data Pribadi
            </v-card-title>
            <v-card-text class="d-flex flex-column align-start ga-4">
              <div>
                <strong>NIK:</strong> {{ ijazah.nomorIndukKependudukan }}
              </div>
              <div>
                <strong>Tempat Lahir:</strong>
                {{ ijazah.tempatLahir || '-' }}
              </div>
              <div>
                <strong>Tanggal Lahir:</strong>
                {{ formatDate(ijazah.tanggalLahir) }}
              </div>
              <div>
                <strong>Program Studi:</strong> {{ ijazah.programStudi }}
              </div>
              <div><strong>Fakultas:</strong> {{ ijazah.fakultas }}</div>
              <div>
                <strong>Jenis Pendidikan:</strong>
                {{ ijazah.jenisPendidikan }}
              </div>
              <div><strong>Gelar:</strong> {{ ijazah.gelarPendidikan }}</div>
            </v-card-text>
          </div>

          <v-divider vertical class="mx-4"></v-divider>

          <div class="pa-4 d-flex flex-column ga-2">
            <!-- Document Information -->
            <div class="d-flex flex-column ga-4">
              <v-card-title class="text-uppercase font-weight-bold pb-2">
                <v-icon left color="primary">mdi-file-document</v-icon>
                Informasi Dokumen
              </v-card-title>
              <v-card-text class="d-flex flex-column align-start ga-2">
                <div>
                  <strong>Nomor Dokumen:</strong> {{ ijazah.nomorDokumen }}
                </div>
                <div>
                  <strong>Nomor Ijazah Nasional:</strong>
                  {{ ijazah.nomorIjazahNasional }}
                </div>
                <div>
                  <strong>Tempat Diberikan:</strong>
                  {{ ijazah.tempatIjazahDiberikan }}
                </div>
                <div>
                  <strong>Tanggal Diberikan:</strong>
                  {{ formatDate(ijazah.tanggalIjazahDiberikan) }}
                </div>
              </v-card-text>
            </div>

            <!-- Academic Timeline -->
            <div class="d-flex flex-column ga-4">
              <v-card-title class="text-uppercase font-weight-bold pb-2">
                <v-icon left color="primary">mdi-calendar-clock</v-icon>
                Timeline Akademik
              </v-card-title>
              <v-card-text class="d-flex flex-column align-start ga-2">
                <div>
                  <strong>Tahun Diterima:</strong> {{ ijazah.tahunDiterima }}
                </div>
                <div>
                  <strong>Tanggal Lulus:</strong>
                  {{ formatDate(ijazah.tanggalLulus) }}
                </div>
                <div>
                  <strong>Akreditasi:</strong>
                  {{ ijazah.akreditasiProgramStudi }}
                </div>
                <div>
                  <strong>Keputusan Akreditasi:</strong>
                  {{ ijazah.keputusanAkreditasiProgramStudi }}
                </div>
              </v-card-text>
            </div>
          </div>
        </v-card>
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

// Computed properties
const certificateUrl = computed(() => {
  if (ijazah.value?.ipfsCID) {
    return `${import.meta.env.VITE_API_BASE_URL}/ipfs/${ijazah.value.ipfsCID}`
  }
  return null
})

const photoUrl = computed(() => {
  if (ijazah.value?.photoPath) {
    return `${import.meta.env.VITE_API_BASE_URL}/api/files/photos/${ijazah.value.photoPath}`
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

const onPhotoError = () => {
  console.warn('Failed to load student photo')
}

const goBack = () => {
  router.push('/ijazah')
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
