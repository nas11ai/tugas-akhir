<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <!-- Header -->
    <v-card class="mt-4 pa-4">
      <div class="d-flex align-center justify-space-between mb-4">
        <div class="d-flex align-center gap-4">
          <v-btn color="secondary" outlined @click="$router.push('/ijazah')">
            <v-icon left>mdi-arrow-left</v-icon>
            Kembali
          </v-btn>
          <div>
            <h2 class="text-h5 mb-1">Kelola Tanda Tangan</h2>
            <p class="text-body-2 grey--text ma-0">
              Kelola tanda tangan rektor untuk pengesahan ijazah
            </p>
          </div>
        </div>
      </div>
    </v-card>

    <!-- Data Table -->
    <v-card class="mt-4 pa-4">
      <div class="d-flex align-center gap-4 mb-4">
        <v-text-field
          class="w-100"
          v-model="search"
          label="Cari tanda tangan"
          dense
          outlined
          hide-details
        ></v-text-field>
        <v-spacer></v-spacer>
        <v-btn
          color="primary"
          dark
          @click="openAddSignatureModal"
          :loading="signatureLoading"
        >
          Tambah Tanda Tangan
        </v-btn>
      </div>
      <v-data-table
        :headers="signatureHeaders"
        :search="search"
        :items="signatures"
        :loading="signatureLoading"
        class="elevation-1"
      >
        <template v-slot:[`item.actions`]="{ item }">
          <div class="d-flex gap-1">
            <!-- Aktifkan Tanda Tangan -->
            <v-tooltip text="Aktifkan Tanda Tangan" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-if="!item.IsActive"
                  icon
                  small
                  color="green"
                  @click="setActiveSignature(item.ID)"
                  :loading="signatureActionLoading"
                  v-bind="props"
                >
                  <v-icon small>mdi-check</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <!-- Nonaktifkan Tanda Tangan -->
            <v-tooltip text="Nonaktifkan Tanda Tangan" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-if="item.IsActive"
                  icon
                  small
                  color="orange"
                  @click="deactivateSignature(item.ID)"
                  :loading="signatureActionLoading"
                  v-bind="props"
                >
                  <v-icon small>mdi-pause</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <!-- Lihat Gambar -->
            <v-tooltip text="Lihat gambar" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-if="item.CID"
                  icon
                  x-small
                  color="white"
                  @click="openImageInNewTab(item.CID)"
                  class="mt-1"
                  v-bind="props"
                >
                  <v-icon x-small>mdi-magnify-plus-outline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <!-- Edit -->
            <v-tooltip text="Edit Tanda Tangan" location="top">
              <template #activator="{ props }">
                <v-btn
                  icon
                  small
                  color="white"
                  @click="editSignature(item)"
                  v-bind="props"
                >
                  <v-icon small>mdi-pencil</v-icon>
                </v-btn>
              </template>
            </v-tooltip>

            <!-- Hapus -->
            <v-tooltip text="Hapus Tanda Tangan" location="top">
              <template #activator="{ props }">
                <v-btn
                  icon
                  small
                  color="white"
                  @click="confirmDeleteSignature(item)"
                  :disabled="item.IsActive"
                  v-bind="props"
                >
                  <v-icon small>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
        </template>
        <!-- <template v-slot:[`item.preview`]="{ item }">
          <div class="signature-preview">
            <v-tooltip text="Lihat gambar" location="top">
              <template #activator="{ props }">
                <v-btn
                  v-if="item.CID"
                  icon
                  x-small
                  color="white"
                  @click="openImageInNewTab(item.CID)"
                  class="mt-1"
                  v-bind="props"
                >
                  <v-icon x-small>mdi-open-in-new</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
          </div>
        </template> -->

        <template v-slot:[`item.IsActive`]="{ item }">
          <v-chip :color="item.IsActive ? 'green' : 'grey'" dark small>
            {{ item.IsActive ? 'Aktif' : 'Tidak Aktif' }}
          </v-chip>
        </template>

        <template v-slot:[`item.CreatedAt`]="{ item }">
          {{ formatTableDate(item.CreatedAt) }}
        </template>

        <template v-slot:[`item.UpdatedAt`]="{ item }">
          {{ formatTableDate(item.UpdatedAt) }}
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal Add/Edit Signature -->
    <v-dialog v-model="signatureModal" max-width="600px" persistent>
      <v-card>
        <v-card-title class="orange white--text">
          <v-icon left color="white">mdi-draw</v-icon>
          {{ isEditingSignature ? 'Edit' : 'Tambah' }} Tanda Tangan
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="pa-6">
          <v-form
            ref="signatureForm"
            v-model="signatureFormValid"
            lazy-validation
          >
            <v-text-field
              v-model="signatureFormData.ID"
              label="ID Tanda Tangan"
              :rules="signatureIdRules"
              outlined
              dense
              required
              :disabled="isEditingSignature"
            />

            <div
              v-if="isEditingSignature && currentSignature?.CID"
              class="mb-4"
            >
              <v-card outlined>
                <v-card-subtitle>Tanda Tangan Saat Ini</v-card-subtitle>
                <v-card-text class="text-center">
                  <v-img
                    :src="getProxiedImageUrl(currentSignature.CID)"
                    max-width="200"
                    max-height="100"
                    contain
                    class="mx-auto"
                    @error="
                      (error: string | undefined) => {
                        console.log('Image load error:', error)
                      }
                    "
                    @load="
                      (load: string | undefined) => {
                        console.log('Image on load:', load)
                      }
                    "
                  >
                    <template v-slot:placeholder>
                      <v-row
                        class="fill-height ma-0"
                        align="center"
                        justify="center"
                      >
                        <v-progress-circular
                          indeterminate
                        ></v-progress-circular>
                      </v-row>
                    </template>
                  </v-img>
                  <v-btn
                    small
                    outlined
                    color="blue"
                    @click="openImageInNewTab(currentSignature.CID)"
                    class="mt-2"
                  >
                    <v-icon left small>mdi-open-in-new</v-icon>
                    Buka di Tab Baru
                  </v-btn>
                </v-card-text>
              </v-card>
            </div>

            <v-file-input
              v-model="signatureFile"
              label="File Tanda Tangan"
              accept="image/png"
              :rules="signatureFileRules"
              outlined
              dense
              show-size
              prepend-icon="mdi-camera"
              :required="!isEditingSignature"
            />

            <v-switch
              v-if="!isEditingSignature"
              v-model="signatureFormData.IsActive"
              :label="signatureFormData.IsActive ? 'Aktif' : 'Tidak Aktif'"
              color="orange"
            />

            <v-alert
              v-if="signatureFormData.IsActive && !isEditingSignature"
              type="warning"
              dense
              outlined
            >
              Mengaktifkan tanda tangan ini akan menonaktifkan tanda tangan lain
              yang sedang aktif.
            </v-alert>
          </v-form>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions class="pa-4">
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            outlined
            @click="closeSignatureModal"
            :disabled="signatureLoading"
          >
            Batal
          </v-btn>
          <v-btn
            color="orange"
            @click="submitSignature"
            :loading="signatureLoading"
            :disabled="!signatureFormValid"
          >
            <v-icon left>mdi-content-save</v-icon>
            {{ isEditingSignature ? 'Update' : 'Simpan' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Dialog Konfirmasi Delete Signature -->
    <v-dialog v-model="deleteSignatureDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon left color="red">mdi-alert</v-icon>
          Konfirmasi Hapus Tanda Tangan
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="py-4">
          Apakah Anda yakin ingin menghapus tanda tangan:
          <br /><strong>{{ signatureToDelete?.ID }}</strong
          ><br /><br />
          <v-alert type="warning" dense outlined>
            Tindakan ini tidak dapat dibatalkan!
          </v-alert>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            outlined
            @click="deleteSignatureDialog = false"
            :disabled="signatureLoading"
          >
            Batal
          </v-btn>
          <v-btn
            color="red"
            @click="deleteSignature"
            :loading="signatureLoading"
          >
            <v-icon left>mdi-delete</v-icon>
            Hapus
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Snackbar untuk notifikasi -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      top
    >
      {{ snackbar.message }}

      <template #actions>
        <v-btn variant="text" @click="snackbar.show = false"> Tutup </v-btn>
      </template>
    </v-snackbar>
  </BaseLayout>
</template>

<script lang="ts" setup>
import BaseLayout from '@/layouts/BaseLayout.vue'
import { ref, onMounted } from 'vue'
import { apiService, apiHelper } from '@/config/axios'
import { formatTableDate } from '@/helpers/formatTableDate'

// Reactive data
const search = ref('')
const signatureModal = ref(false)
const deleteSignatureDialog = ref(false)
const signatureLoading = ref(false)
const signatureActionLoading = ref(false)
const signatureFormValid = ref(false)
const signatureForm = ref()
const signatureFile = ref<File | null>(null)
const isEditingSignature = ref(false)

// Signature data
const signatures = ref<
  Array<{
    ID: string
    CID: string
    IsActive: boolean
    CreatedAt?: string
    UpdatedAt?: string
  }>
>([])

const currentSignature = ref<{
  ID: string
  CID: string
  IsActive: boolean
} | null>(null)

const signatureToDelete = ref<{
  ID: string
  CID: string
  IsActive: boolean
} | null>(null)

const signatureFormData = ref({
  ID: '',
  IsActive: false,
})

// Snackbar for notifications
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
})

const signatureHeaders = [
  { title: 'Aksi', value: 'actions', sortable: false, width: '180px' },
  { title: 'ID', value: 'ID', sortable: true },
  { title: 'Status', value: 'IsActive', sortable: true },
  { title: 'Dibuat', value: 'CreatedAt', sortable: true },
  { title: 'Diperbarui', value: 'UpdatedAt', sortable: true },
]

// Validation rules
const signatureIdRules = [
  (v: string) => !!v || 'ID tanda tangan wajib diisi',
  (v: string) => (v && v.length >= 3) || 'ID minimal 3 karakter',
]

const signatureFileRules = [
  (v: File[] | File | null) => {
    if (isEditingSignature.value) return true // File optional for edit
    if (!v) return 'File tanda tangan wajib diisi'

    const file = Array.isArray(v) ? v[0] : v
    if (!file) return 'File tanda tangan wajib diisi'

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return 'Ukuran file maksimal 5MB'
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'File harus berupa gambar'
    }

    return true
  },
]

// Methods
const loadSignatures = async () => {
  signatureLoading.value = true

  try {
    const response = await apiService.signature.getAll()

    if (apiHelper.isSuccess(response)) {
      signatures.value = response.data.data || []
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error loading signatures:', error)
    showSnackbar('Gagal memuat data tanda tangan', 'error')
  } finally {
    signatureLoading.value = false
  }
}

const openAddSignatureModal = () => {
  isEditingSignature.value = false
  currentSignature.value = null
  signatureFormData.value = {
    ID: '',
    IsActive: false,
  }
  signatureFile.value = null
  signatureModal.value = true
}

const editSignature = (signature: (typeof signatures.value)[number]) => {
  isEditingSignature.value = true
  currentSignature.value = signature
  signatureFormData.value = {
    ID: signature.ID,
    IsActive: signature.IsActive,
  }
  signatureFile.value = null
  signatureModal.value = true
}

const closeSignatureModal = () => {
  signatureModal.value = false
  isEditingSignature.value = false
  currentSignature.value = null
  signatureFormData.value = {
    ID: '',
    IsActive: false,
  }
  signatureFile.value = null
  if (signatureForm.value) {
    signatureForm.value.reset()
  }
}

const submitSignature = async () => {
  if (!signatureForm.value.validate()) {
    return
  }

  signatureLoading.value = true

  try {
    if (isEditingSignature.value) {
      // Update existing signature
      if (!signatureFile.value) {
        showSnackbar('File tanda tangan wajib diisi', 'error')
        return
      }

      const formData = new FormData()
      formData.append('ID', signatureFormData.value.ID)
      formData.append('IsActive', signatureFormData.value.IsActive.toString())
      formData.append('signature', signatureFile.value)

      const response = await apiService.signature.upload(formData)

      if (apiHelper.isSuccess(response)) {
        showSnackbar('Tanda tangan berhasil diupdate', 'success')
      } else {
        throw new Error(apiHelper.getErrorMessage(response))
      }
    } else {
      // Create new signature
      if (!signatureFile.value) {
        showSnackbar('File tanda tangan wajib diisi', 'error')
        return
      }

      const formData = new FormData()
      formData.append('ID', signatureFormData.value.ID)
      formData.append('IsActive', signatureFormData.value.IsActive.toString())
      formData.append('signature', signatureFile.value)

      const response = await apiService.signature.upload(formData)

      if (apiHelper.isSuccess(response)) {
        showSnackbar('Tanda tangan berhasil ditambahkan', 'success')
      } else {
        throw new Error(apiHelper.getErrorMessage(response))
      }
    }

    closeSignatureModal()
    await loadSignatures()
  } catch (error) {
    console.error('Error saving signature:', error)
    showSnackbar(apiHelper.getErrorMessage(error as Error), 'error')
  } finally {
    signatureLoading.value = false
  }
}

const setActiveSignature = async (id: string) => {
  signatureActionLoading.value = true

  try {
    const response = await apiService.signature.activate(id)

    if (apiHelper.isSuccess(response)) {
      showSnackbar('Tanda tangan berhasil diaktifkan', 'success')
      await loadSignatures()
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error activating signature:', error)
    showSnackbar('Gagal mengaktifkan tanda tangan', 'error')
  } finally {
    signatureActionLoading.value = false
  }
}

const deactivateSignature = async (id: string) => {
  signatureActionLoading.value = true

  try {
    const response = await apiService.signature.deactivate(id)

    if (apiHelper.isSuccess(response)) {
      showSnackbar('Tanda tangan berhasil dinonaktifkan', 'success')
      await loadSignatures()
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error deactivating signature:', error)
    showSnackbar('Gagal menonaktifkan tanda tangan', 'error')
  } finally {
    signatureActionLoading.value = false
  }
}

const confirmDeleteSignature = (
  signature: (typeof signatures.value)[number]
) => {
  signatureToDelete.value = signature
  deleteSignatureDialog.value = true
}

const deleteSignature = async () => {
  if (!signatureToDelete.value) return

  signatureLoading.value = true

  try {
    const response = await apiService.signature.delete(
      signatureToDelete.value.ID
    )

    if (apiHelper.isSuccess(response)) {
      showSnackbar('Tanda tangan berhasil dihapus', 'success')
      deleteSignatureDialog.value = false
      signatureToDelete.value = null
      await loadSignatures()
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error deleting signature:', error)
    showSnackbar('Gagal menghapus tanda tangan', 'error')
  } finally {
    signatureLoading.value = false
  }
}

const openImageInNewTab = (cid: string) => {
  const url = getProxiedImageUrl(cid)
  // Open with ngrok headers
  const newWindow = window.open('', '_blank')
  if (newWindow) {
    newWindow.document.write(`
      <html>
        <head><title>Signature Preview</title></head>
        <body style="margin:0; display:flex; align-items:center; justify-content:center; min-height:100vh; background:#f5f5f5;">
          <img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;" />
        </body>
      </html>
    `)
  }
}

// Helper function untuk convert CID ke proxy URL
const getProxiedImageUrl = (cid: string) => {
  if (!cid) return ''

  // Extract IPFS hash jika format lengkap IPFS URL
  let hash = cid
  if (cid.includes('/ipfs/')) {
    hash = cid.split('/ipfs/')[1]
  }

  // Use backend proxy endpoint
  const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  return `${baseUrl}/ipfs/${hash}`
}

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
  }
}

onMounted(() => {
  loadSignatures()
})
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}

.gap-2 {
  gap: 8px;
}

.gap-1 {
  gap: 4px;
}

.signature-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.signature-preview .v-btn {
  min-width: auto !important;
}
</style>
