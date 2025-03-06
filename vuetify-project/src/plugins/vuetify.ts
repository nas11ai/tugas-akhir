/**
 * plugins/vuetify.ts
 *
 * Framework documentation: https://vuetifyjs.com`
 */

// Styles
import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

// Composables
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// https://vuetifyjs.com/en/introduction/why-vuetify/#feature-guides
const myTheme = {
  dark: false, // Set ke true jika ingin dark mode
  colors: {
    primary: '#1E88E5',
    secondary: '#6D4C41',
    accent: '#F57C00',
    error: '#FF5252',
    info: '#2196F3',
    success: '#4CAF50',
    surface: '#FFFFFF',
    background: '#F1F3F4',
  },
}

export default createVuetify({
  theme: {
    defaultTheme: 'myTheme',
    themes: {
      myTheme,
    },
  },
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
})
