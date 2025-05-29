<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <!-- Kontainer Tabel -->
    <v-card class="mt-4 pa-4">
      <!-- Tombol Aksi -->
      <div class="d-flex align-center gap-4 mb-4">
        <v-btn color="warning" dark @click="navigateToSignature"
          >KELOLA TANDA TANGAN</v-btn
        >
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
              :disabled="loading"
            >
              <v-icon>mdi-pencil</v-icon>
            </v-btn>
            <v-btn
              icon
              color="white"
              @click="confirmDelete(item)"
              :disabled="loading"
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
import { useRouter } from 'vue-router'
import { apiService, apiHelper } from '@/config/axios'
import type { Ijazah } from '@/config/ijazah'

// Router instance
const router = useRouter()

// Reactive data
const search = ref('')
const detailModal = ref(false)
const addModal = ref(false)
const editModal = ref(false)
const deleteDialog = ref(false)
const loading = ref(false)
const tableLoading = ref(false)

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

// Methods
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

const navigateToSignature = () => {
  router.push('/signature')
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
