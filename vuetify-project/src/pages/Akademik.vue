<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <!-- Kontainer Tabel -->
    <v-card class="mt-4 pa-4">
      <!-- Tombol Aksi -->
      <div class="d-flex align-center gap-4 mb-4">
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
          <v-icon left>mdi-plus</v-icon>
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
          <v-btn icon @click="showDetail(item)" :disabled="loading">
            <v-icon>mdi-eye</v-icon>
          </v-btn>
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

    <!-- Snackbar untuk notifikasi -->
    <v-snackbar
      v-model="snackbar.show"
      :color="snackbar.color"
      :timeout="4000"
      top
    >
      {{ snackbar.message }}
      <template v-slot:action="{ attrs }">
        <v-btn text v-bind="attrs" @click="snackbar.show = false">
          Tutup
        </v-btn>
      </template>
    </v-snackbar>
  </BaseLayout>
</template>

<script lang="ts" setup>
import BaseLayout from '@/layouts/BaseLayout.vue'
import AddIjazahModal from '@/components/AddIjazahModal.vue'
import { ref, onMounted } from 'vue'
import { apiService, apiHelper } from '@/config/axios'
import type { Ijazah } from '@/config/ijazah'

// Reactive data
const search = ref('')
const detailModal = ref(false)
const addModal = ref(false)
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

// Snackbar for notifications
const snackbar = ref({
  show: false,
  message: '',
  color: 'success',
})

const headers = [
  { title: 'Pilih', value: 'select', sortable: false },
  { title: 'Aksi', value: 'aksi', sortable: false },
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

const onAddSuccess = (message: string) => {
  showSnackbar(message, 'success')
  loadIjazahData() // Refresh data
}

const onAddError = (message: string) => {
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
        id: ijazah.ID || ijazah.id,
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

// Load data on component mount
onMounted(() => {
  loadIjazahData()
})
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}
</style>
