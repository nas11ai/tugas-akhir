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
        <v-btn color="blue" dark>Tambah</v-btn>
      </div>

      <!-- Data Table -->
      <v-data-table
        :headers="headers"
        :items="items"
        :search="search"
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
          <v-btn icon @click="showDetail(item)">
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
    <v-dialog v-model="modal" max-width="500px">
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
          <v-btn color="blue" @click="modal = false">Tutup</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </BaseLayout>
</template>

<script lang="ts" setup>
import BaseLayout from '@/layouts/BaseLayout.vue'
import { ref } from 'vue'

const search = ref('')
const modal = ref(false)
const selectedItem = ref<{
  id: string
  nama: string
  nim: string
  prodi: string
  noIjazah: string
  status: string
} | null>(null)

const selectedItems = ref([])

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
>([
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
])

const getStatusColor = (status?: string) => {
  switch (status) {
    case 'Disetujui':
      return 'green'
    case 'Pending':
      return 'orange'
    case 'Ditolak':
      return 'red'
    default:
      return 'gray'
  }
}

const showDetail = (item: (typeof items.value)[number]) => {
  selectedItem.value = item
  modal.value = true
}
</script>

<style scoped>
.gap-4 {
  gap: 16px;
}
</style>
