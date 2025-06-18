<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <div class="d-flex flex-column justify-center align-center pt-16 ga-4">
      <v-img :src="logo" alt="logo ITK" width="200" height="200"></v-img>
      <h1 class="text-h1 mt-4">Certichain</h1>
      <p class="text-body-1 text-center px-4">
        "Verifikasi Ijazah Mahasiswa Institut Teknologi Kalimantan Secara Digital"
      </p>

      <!-- Search Bar -->
      <div class="mt-8 w-100 w-md-50">
        <v-text-field v-model="searchQuery" label="Masukkan ID Ijazah untuk Verifikasi" variant="outlined"
          prepend-inner-icon="mdi-magnify" append-icon="mdi-send" class="w-100" color="primary" clearable
          :loading="searching" :error="!!searchError" :error-messages="searchError" @keyup.enter="searchIjazah"
          @click:clear="clearSearch" @click:append="searchIjazah"></v-text-field>
      </div>
    </div>

    <!-- Modal Hasil Pencarian -->
    <v-dialog v-model="showModal" max-width="700" persistent>
      <v-card>
        <!-- Header Modal -->
        <v-card-title class="d-flex align-center pa-6">
          <v-icon :color="modalData.success ? 'success' : 'error'" size="32" class="mr-3">
            {{ modalData.success ? 'mdi-check-circle' : 'mdi-alert-circle' }}
          </v-icon>
          <span class="text-h5">
            {{
              modalData.success ? 'Ijazah Ditemukan' : 'Ijazah Tidak Ditemukan'
            }}
          </span>
          <v-spacer></v-spacer>
        </v-card-title>

        <v-divider></v-divider>

        <!-- Content Modal -->
        <v-card-text class="pa-6">
          <!-- Jika Ijazah Ditemukan -->
          <div v-if="modalData.success && modalData.ijazah">
            <!-- Header -->
            <div class="text-center mb-6">
              <h3 class="text-h6 mb-2">
                <v-icon left color="primary">mdi-account-school</v-icon>
                Informasi Lulusan
              </h3>
            </div>

            <!-- Data Ijazah - Responsive Layout -->
            <div class="ijazah-info-container">
              <div class="ijazah-info-column">
                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-account</v-icon>
                    <strong>Nama Lengkap</strong>
                  </div>
                  <div class="info-value">{{ modalData.ijazah.nama }}</div>
                </div>

                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-card-account-details</v-icon>
                    <strong>NIM</strong>
                  </div>
                  <div class="info-value">
                    {{ modalData.ijazah.nomorIndukMahasiswa }}
                  </div>
                </div>

                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-school</v-icon>
                    <strong>Program Studi</strong>
                  </div>
                  <div class="info-value">
                    {{ modalData.ijazah.programStudi }}
                  </div>
                </div>

                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-domain</v-icon>
                    <strong>Fakultas</strong>
                  </div>
                  <div class="info-value">{{ modalData.ijazah.fakultas }}</div>
                </div>
              </div>

              <div class="ijazah-info-column">
                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-star</v-icon>
                    <strong>Akreditasi Program Studi</strong>
                  </div>
                  <div class="info-value">
                    {{ modalData.ijazah.akreditasiProgramStudi }}
                  </div>
                </div>

                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-book-education</v-icon>
                    <strong>Jenis Pendidikan</strong>
                  </div>
                  <div class="info-value">
                    {{ modalData.ijazah.jenisPendidikan }}
                  </div>
                </div>

                <div class="info-item mb-3">
                  <div class="info-label">
                    <v-icon small color="primary" class="mr-2">mdi-calendar-check</v-icon>
                    <strong>Tanggal Lulus</strong>
                  </div>
                  <div class="info-value">
                    {{ formatDate(modalData.ijazah.tanggalLulus) }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Verification Info -->
            <v-alert type="success" variant="tonal" class="mt-4" border="start">
              <template v-slot:prepend>
                <v-icon>mdi-shield-check</v-icon>
              </template>
              <div class="font-weight-bold">Ijazah Terverifikasi</div>
              <div class="text-caption">
                Ijazah ini telah diverifikasi dan terdaftar dalam sistem.
              </div>
            </v-alert>
          </div>

          <!-- Jika Ijazah Tidak Ditemukan -->
          <div v-else class="text-center">
            <v-icon size="80" color="error" class="mb-4">
              mdi-file-document-remove
            </v-icon>

            <h3 class="text-h6 mb-2">Ijazah Tidak Dapat Ditemukan</h3>
            <p class="text-body-2 grey--text mb-4">
              {{
                modalData.message ||
                'ID ijazah yang Anda masukkan tidak valid atau ijazah tidak dalam status aktif.'
              }}
            </p>

            <v-alert type="warning" variant="tonal" class="text-left">
              <div class="font-weight-bold mb-1">Kemungkinan Penyebab:</div>
              <ul class="text-caption">
                <li>ID ijazah yang dimasukkan salah</li>
                <li>Ijazah belum diaktivasi dalam sistem</li>
                <li>Ijazah dalam status non-aktif</li>
                <li>Ijazah tidak terdaftar dalam sistem</li>
              </ul>
            </v-alert>
          </div>
        </v-card-text>

        <!-- Actions -->
        <v-card-actions class="pa-6 pt-0">
          <v-spacer></v-spacer>
          <v-btn color="grey" variant="text" @click="closeModal"> Tutup </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Loading Overlay -->
    <v-overlay v-model="searching" class="d-flex justify-center align-center">
      <div class="text-center">
        <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        <p class="mt-4">Mencari ijazah...</p>
      </div>
    </v-overlay>
  </BaseLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import BaseLayout from '@/layouts/BaseLayout.vue'
import logo from '@/assets/logo.png'
import { apiService, apiHelper } from '@/config/axios'
import type { Ijazah } from '@/config/ijazah'
import { IJAZAH_STATUS } from '@/config/ijazah'

// Reactive data
const searchQuery = ref('')
const searching = ref(false)
const searchError = ref('')
const showModal = ref(false)

// Modal data
const modalData = ref<{
  success: boolean
  ijazah?: Ijazah
  message?: string
}>({
  success: false,
})

// Methods
const searchIjazah = async () => {
  // Check if search is already in progress or query is empty
  if (!searchQuery.value?.trim() || searching.value) {
    if (!searchQuery.value?.trim()) {
      searchError.value = 'Silakan masukkan ID ijazah'
    }
    return
  }

  // Clear previous errors
  searchError.value = ''
  searching.value = true

  try {
    console.log('🔍 Searching for ijazah:', searchQuery.value)

    // Call API to get ijazah data
    const response = await apiService.ijazah.getPublic(searchQuery.value.trim())

    console.log('📡 API Response:', response)

    // Check if response has data
    if (response.data) {
      const ijazahData = response.data.data || response.data

      console.log('📊 Ijazah Data:', ijazahData)

      // Check if ijazah status is active
      if (ijazahData.Status === IJAZAH_STATUS.AKTIF) {
        modalData.value = {
          success: true,
          ijazah: ijazahData,
          message: 'Ijazah ditemukan dan terverifikasi',
        }
      } else {
        modalData.value = {
          success: false,
          message: ``,
        }
      }
    } else {
      modalData.value = {
        success: false,
        message: 'Data ijazah tidak ditemukan dalam respons server',
      }
    }

    showModal.value = true
  } catch (error) {
    console.error('❌ Error searching ijazah:', error)

    const errorMessage = apiHelper.getErrorMessage(error as Error)

    modalData.value = {
      success: false,
      message: errorMessage.includes('404')
        ? 'Ijazah dengan ID tersebut tidak ditemukan dalam sistem'
        : errorMessage,
    }

    showModal.value = true
  } finally {
    searching.value = false
  }
}

const clearSearch = () => {
  searchQuery.value = ''
  searchError.value = ''
}

const closeModal = () => {
  showModal.value = false
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

// Expose searchQuery for parent components if needed
defineExpose({ searchQuery })
</script>

<style scoped>
.w-md-50 {
  max-width: 500px;
}

/* Responsive container for ijazah info */
.ijazah-info-container {
  display: flex;
  gap: 16px;
  flex-direction: row;
}

.ijazah-info-column {
  flex: 1;
}

.info-item {
  border-left: 3px solid #1976d2;
  padding-left: 12px;
  background-color: #f8f9fa;
  border-radius: 4px;
  padding: 8px 12px;
}

.info-label {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: #424242;
  margin-bottom: 4px;
}

.info-value {
  font-size: 1rem;
  font-weight: 500;
  color: #212121;
  margin-left: 24px;
}

.v-dialog .v-card {
  border-radius: 12px;
}

/* Mobile responsiveness */
@media (max-width: 600px) {
  .ijazah-info-container {
    flex-direction: column;
    gap: 0;
  }

  .ijazah-info-column {
    width: 100%;
  }

  .info-item {
    margin-bottom: 16px;
  }

  .v-card-title {
    padding: 16px !important;
    flex-direction: column;
    text-align: center;
    gap: 8px;
  }

  .v-card-title .text-h5 {
    font-size: 1.25rem !important;
  }

  .v-card-text {
    padding: 16px !important;
  }

  .v-card-actions {
    padding: 16px !important;
    padding-top: 0 !important;
    flex-direction: column;
    gap: 8px;
  }

  .v-card-actions .v-btn {
    width: 100%;
  }
}

/* Tablet responsiveness */
@media (max-width: 768px) and (min-width: 601px) {
  .ijazah-info-container {
    flex-direction: column;
    gap: 8px;
  }

  .v-card-title {
    padding: 20px !important;
  }

  .v-card-text {
    padding: 20px !important;
  }
}
</style>
