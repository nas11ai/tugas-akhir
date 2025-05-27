<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <!-- Kontainer Tabel -->
    <v-card class="mt-4 pa-4">
      <!-- Tombol Aksi -->
      <div class="d-flex align-center gap-4 mb-4">
        <v-btn color="warning" dark @click="openSignatureListModal"
          >KELOLA TANDA TANGAN</v-btn
        >
        <v-btn color="blue" dark>FILTER</v-btn>
        <v-text-field
          class="w-100"
          v-model="search"
          label="Cari nama, nim, dan nomor ijazah"
          dense
          outlined
          hide-details
        ></v-text-field>
        <v-spacer></v-spacer>
        <v-btn color="blue" dark @click="openAddDialog" :loading="loading">
          Tambah
        </v-btn>
      </div>

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="items"
        :search="search"
        :loading="tableLoading"
        class="elevation-1"
      >
        <template v-slot:[`item.select`]="{ item }">
          <v-checkbox
            v-model="selectedItems"
            :value="item"
            hide-details
          ></v-checkbox>
        </template>

        <template v-slot:[`item.aksi`]="{ item }">
          <div class="d-flex gap-2">
            <v-btn
              color="white"
              icon
              @click="showDetail(item)"
              :disabled="loading"
            >
              <v-icon>mdi-eye</v-icon>
            </v-btn>
            <v-btn
              color="white"
              icon
              @click="openEditDialog(item)"
              :disabled="
                loading || item.status !== 'menunggu tanda tangan rektor'
              "
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              color="white"
              @click="confirmDelete(item)"
              :disabled="
                loading || item.status !== 'menunggu tanda tangan rektor'
              "
            >
              <v-icon>mdi-delete</v-icon>
            </v-btn>
          </div>
        </template>

        <template v-slot:[`item.status`]="{ item }">
          <v-chip :color="getStatusColor(item.status || '')" dark>{{
            item.status
          }}</v-chip>
        </template>
      </v-data-table>
    </v-card>

    <!-- Modal Detail -->
    <v-dialog v-model="detailModal" max-width="500px">
      <v-card>
        <v-card-title>Detail Sertifikat</v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <p><strong>ID:</strong> {{ selectedItem?.id }}</p>
          <p><strong>Nama:</strong> {{ selectedItem?.nama }}</p>
          <p><strong>NIM:</strong> {{ selectedItem?.nim }}</p>
          <p><strong>Program Studi:</strong> {{ selectedItem?.prodi }}</p>
          <p><strong>Nomor Ijazah:</strong> {{ selectedItem?.noIjazah }}</p>
          <p>
            <strong>Status:</strong>
            <v-chip :color="getStatusColor(selectedItem?.status)" dark>
              {{ selectedItem?.status }}
            </v-chip>
          </p>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue" @click="detailModal = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal Form Tambah Ijazah -->
    <AddIjazahModal
      v-model="addModal"
      @success="onAddSuccess"
      @error="onAddError"
    />

    <!-- Modal Form Edit Ijazah -->
    <EditIjazahModal
      v-model="editModal"
      :edit-data="editData"
      @success="onEditSuccess"
      @error="onEditError"
    />

    <!-- Dialog Konfirmasi Delete -->
    <v-dialog v-model="deleteDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6">
          <v-icon left color="red">mdi-alert</v-icon>
          Konfirmasi Hapus
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text class="py-4">
          Apakah Anda yakin ingin menghapus ijazah untuk:
          <br /><strong>{{ itemToDelete?.nama }}</strong> <br />NIM:
          <strong>{{ itemToDelete?.nim }}</strong> <br /><br />
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
            @click="deleteDialog = false"
            :disabled="loading"
          >
            Batal
          </v-btn>
          <v-btn color="red" @click="deleteIjazah" :loading="loading">
            <v-icon left>mdi-delete</v-icon>
            Hapus
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Modal List Signatures -->
    <v-dialog v-model="signatureListModal" max-width="800px">
      <v-card>
        <v-card-title class="orange white--text">
          <v-icon left color="white">mdi-draw</v-icon>
          Kelola Tanda Tangan Rektor
          <v-spacer></v-spacer>
          <v-btn color="white" outlined @click="openAddSignatureModal">
            <v-icon left>mdi-plus</v-icon>
            Tambah Tanda Tangan
          </v-btn>
        </v-card-title>
        <v-divider></v-divider>
        <v-card-text>
          <v-data-table
            :headers="signatureHeaders"
            :items="signatures"
            :loading="signatureLoading"
            class="elevation-1"
          >
            <template v-slot:[`item.preview`]="{ item }">
              <v-img
                :src="item.URL"
                max-width="60"
                max-height="40"
                contain
                @error="($event) => console.log('Image load error:', $event)"
              >
                <template v-slot:placeholder>
                  <v-row
                    class="fill-height ma-0"
                    align="center"
                    justify="center"
                  >
                    <v-icon>mdi-image-off</v-icon>
                  </v-row>
                </template>
              </v-img>
            </template>

            <template v-slot:[`item.IsActive`]="{ item }">
              <v-chip :color="item.IsActive ? 'green' : 'grey'" dark small>
                {{ item.IsActive ? 'Aktif' : 'Tidak Aktif' }}
              </v-chip>
            </template>

            <template v-slot:[`item.actions`]="{ item }">
              <div class="d-flex gap-1">
                <v-btn
                  v-if="!item.IsActive"
                  icon
                  small
                  color="green"
                  @click="setActiveSignature(item.ID)"
                  :loading="signatureActionLoading"
                >
                  <v-icon small>mdi-check</v-icon>
                </v-btn>
                <v-btn
                  v-if="item.IsActive"
                  icon
                  small
                  color="orange"
                  @click="deactivateSignature(item.ID)"
                  :loading="signatureActionLoading"
                >
                  <v-icon small>mdi-pause</v-icon>
                </v-btn>
                <v-btn icon small color="blue" @click="editSignature(item)">
                  <v-icon small>mdi-pencil</v-icon>
                </v-btn>
                <v-btn
                  icon
                  small
                  color="red"
                  @click="confirmDeleteSignature(item)"
                  :disabled="item.IsActive"
                >
                  <v-icon small>mdi-delete</v-icon>
                </v-btn>
              </div>
            </template>
          </v-data-table>
        </v-card-text>
        <v-divider></v-divider>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="blue" @click="signatureListModal = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

            <!-- Preview existing signature for edit -->
            <div
              v-if="isEditingSignature && currentSignature?.URL"
              class="mb-4"
            >
              <v-card outlined>
                <v-card-subtitle>Tanda Tangan Saat Ini</v-card-subtitle>
                <v-card-text class="text-center">
                  <v-img
                    :src="currentSignature.URL"
                    max-width="200"
                    max-height="100"
                    contain
                    class="mx-auto"
                  />
                </v-card-text>
              </v-card>
            </div>

            <v-file-input
              v-model="signatureFile"
              label="File Tanda Tangan"
              accept="image/*"
              :rules="signatureFileRules"
              outlined
              dense
              show-size
              prepend-icon="mdi-camera"
              :required="!isEditingSignature"
            />

            <v-switch
              v-model="signatureFormData.IsActive"
              :label="signatureFormData.IsActive ? 'Aktif' : 'Tidak Aktif'"
              color="orange"
            />

            <v-alert
              v-if="signatureFormData.IsActive"
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
import AddIjazahModal from '@/components/AddIjazahModal.vue'
import EditIjazahModal from '@/components/EditIjazahModal.vue'
import { ref, onMounted } from 'vue'
import { apiService, apiHelper } from '@/config/axios'
import type { Ijazah } from '@/config/ijazah'

// Existing reactive data
const search = ref('')
const detailModal = ref(false)
const addModal = ref(false)
const editModal = ref(false)
const deleteDialog = ref(false)
const loading = ref(false)
const tableLoading = ref(false)

// Signature related reactive data
const signatureListModal = ref(false)
const signatureModal = ref(false)
const deleteSignatureDialog = ref(false)
const signatureLoading = ref(false)
const signatureActionLoading = ref(false)
const signatureFormValid = ref(false)
const signatureForm = ref()
const signatureFile = ref<File | null>(null)
const isEditingSignature = ref(false)

const selectedItem = ref<{
  id: string
  nama: string
  nim: string
  prodi: string
  noIjazah: string
  status: string
} | null>(null)

const selectedItems = ref([])

// Data untuk edit dan delete
const editData = ref<Ijazah | null>(null)
const itemToDelete = ref<{
  id: string
  nama: string
  nim: string
  prodi: string
  noIjazah: string
  status: string
} | null>(null)

// Signature data
const signatures = ref<
  Array<{
    ID: string
    URL: string
    IsActive: boolean
    CreatedAt?: string
    UpdatedAt?: string
  }>
>([])

const currentSignature = ref<{
  ID: string
  URL: string
  IsActive: boolean
} | null>(null)

const signatureToDelete = ref<{
  ID: string
  URL: string
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

const headers = [
  { title: 'Pilih', value: 'select', sortable: false },
  { title: 'Aksi', value: 'aksi', sortable: false, width: '150px' },
  { title: 'ID', value: 'id' },
  { title: 'Nama Mahasiswa', value: 'nama' },
  { title: 'NIM', value: 'nim' },
  { title: 'Program Studi', value: 'prodi' },
  { title: 'Nomor Ijazah', value: 'noIjazah' },
  { title: 'Status', value: 'status' },
]

const signatureHeaders = [
  { title: 'Preview', value: 'preview', sortable: false, width: '80px' },
  { title: 'ID', value: 'ID' },
  { title: 'Status', value: 'IsActive', sortable: false },
  { title: 'Aksi', value: 'actions', sortable: false, width: '150px' },
]

const items = ref<
  Array<{
    id: string
    nama: string
    nim: string
    prodi: string
    noIjazah: string
    status: string
  }>
>([])

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

// Existing methods
const getStatusColor = (status?: string) => {
  switch (status?.toLowerCase()) {
    case 'disetujui':
    case 'aktif':
      return 'green'
    case 'pending':
    case 'menunggu tanda tangan rektor':
      return 'orange'
    case 'ditolak':
      return 'red'
    case 'draft':
      return 'grey'
    default:
      return 'gray'
  }
}

const showDetail = (item: (typeof items.value)[number]) => {
  selectedItem.value = item
  detailModal.value = true
}

const openAddDialog = () => {
  addModal.value = true
}

const openEditDialog = async (item: (typeof items.value)[number]) => {
  try {
    loading.value = true

    // Fetch full ijazah data untuk edit
    const response = await apiService.ijazah.getById(item.id)

    if (apiHelper.isSuccess(response)) {
      editData.value = response.data.data
      console.log('edit data value:', editData.value)
      editModal.value = true
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error fetching ijazah data:', error)
    showSnackbar('Gagal memuat data ijazah untuk edit', 'error')
  } finally {
    loading.value = false
  }
}

const confirmDelete = (item: (typeof items.value)[number]) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const deleteIjazah = async () => {
  if (!itemToDelete.value) return

  try {
    loading.value = true

    const response = await apiService.ijazah.delete(itemToDelete.value.id)

    if (apiHelper.isSuccess(response)) {
      showSnackbar('Ijazah berhasil dihapus', 'success')
      deleteDialog.value = false
      itemToDelete.value = null
      loadIjazahData() // Refresh data
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error deleting ijazah:', error)
    showSnackbar('Gagal menghapus ijazah', 'error')
  } finally {
    loading.value = false
  }
}

const onAddSuccess = (message: string) => {
  showSnackbar(message, 'success')
  loadIjazahData() // Refresh data
}

const onAddError = (message: string) => {
  showSnackbar(message, 'error')
}

const onEditSuccess = (message: string) => {
  showSnackbar(message, 'success')
  loadIjazahData() // Refresh data
}

const onEditError = (message: string) => {
  showSnackbar(message, 'error')
}

const showSnackbar = (message: string, color: string = 'success') => {
  snackbar.value = {
    show: true,
    message,
    color,
  }
}

// Load ijazah data from API
const loadIjazahData = async () => {
  tableLoading.value = true

  try {
    const response = await apiService.ijazah.getAll()

    if (apiHelper.isSuccess(response)) {
      // Transform API data to match table format
      items.value = response.data.data.map((ijazah: Ijazah) => ({
        id: ijazah.ID,
        nama: ijazah.nama,
        nim: ijazah.nomorIndukMahasiswa,
        prodi: ijazah.programStudi,
        noIjazah: ijazah.nomorDokumen,
        status: ijazah.Status,
      }))
    } else {
      throw new Error(apiHelper.getErrorMessage(response))
    }
  } catch (error) {
    console.error('Error loading ijazah data:', error)
    showSnackbar('Gagal memuat data ijazah', 'error')

    // Keep existing mock data as fallback
    items.value = [
      {
        id: 'uuid-001',
        nama: 'Ahmad Setiawan',
        nim: '2201001',
        prodi: 'Teknik Informatika',
        noIjazah: 'IJZ-001',
        status: 'Pending',
      },
      {
        id: 'uuid-002',
        nama: 'Budi Santoso',
        nim: '2201002',
        prodi: 'Sistem Informasi',
        noIjazah: 'IJZ-002',
        status: 'Disetujui',
      },
      {
        id: 'uuid-003',
        nama: 'Citra Dewi',
        nim: '2201003',
        prodi: 'Teknik Elektro',
        noIjazah: 'IJZ-003',
        status: 'Ditolak',
      },
    ]
  } finally {
    tableLoading.value = false
  }
}

// Signature Methods
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

const openSignatureListModal = async () => {
  signatureListModal.value = true
  await loadSignatures()
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
      if (signatureFile.value) {
        // If new file uploaded, need to upload it first
        const formData = new FormData()
        formData.append('ID', signatureFormData.value.ID)
        formData.append('IsActive', signatureFormData.value.IsActive.toString())
        formData.append('signature', signatureFile.value)

        console.log('formData', formData)

        const response = await apiService.signature.upload(formData)

        if (apiHelper.isSuccess(response)) {
          showSnackbar('Tanda tangan berhasil diupdate', 'success')
        } else {
          throw new Error(apiHelper.getErrorMessage(response))
        }
      } else {
        // Only update metadata
        const response = await apiService.signature.update(
          signatureFormData.value.ID,
          {
            IsActive: signatureFormData.value.IsActive,
            ID: '',
            URL: '',
          }
        )

        if (apiHelper.isSuccess(response)) {
          showSnackbar('Tanda tangan berhasil diupdate', 'success')
        } else {
          throw new Error(apiHelper.getErrorMessage(response))
        }
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

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, {
            name: value.name,
            size: value.size,
            type: value.type,
            lastModified: value.lastModified,
          })
        } else {
          console.log(`${key}:`, value)
        }
      }

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
    if (error instanceof Error) {
      showSnackbar(apiHelper.getErrorMessage(error), 'error')
    } else {
      showSnackbar('An unknown error occurred', 'error')
    }
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

// Load data on component mount
onMounted(() => {
  loadIjazahData()
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
</style>
