import { mount, VueWrapper } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import Index from '@/pages/index.vue'
import { nextTick } from 'vue'
import type { ComponentPublicInstance } from 'vue'

// Buat instance Vuetify
const vuetify = createVuetify({
  components,
  directives,
})

// Tentukan tipe komponen agar TypeScript mengenali searchQuery
type IndexInstance = ComponentPublicInstance<{ searchQuery: string }>

describe('Index.vue', () => {
  it('renders search bar and updates input correctly', async () => {
    const wrapper = mount(Index, {
      global: {
        plugins: [vuetify],
      },
    }) as VueWrapper<IndexInstance>

    // Pastikan search bar ada
    const searchField = wrapper.find('input')
    expect(searchField.exists()).toBe(true)

    // Simulasi input di search bar
    await searchField.setValue('Hyperledger')

    // Tunggu Vue menyelesaikan reaktivitas
    await nextTick()

    // Ambil nilai searchQuery tanpa menggunakan `any`
    const searchQueryValue = wrapper.vm.searchQuery
    expect(searchQueryValue).toBe('Hyperledger')
  })
})
