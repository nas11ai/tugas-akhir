<template>
  <v-app>
    <!-- Navbar -->
    <v-app-bar color="primary" scroll-behavior="hide">
      <v-toolbar-title>CertiChain</v-toolbar-title>
      <v-spacer></v-spacer>

      <div v-if="!user" class="d-flex mr-4">
        <v-btn color="white" variant="outlined" @click="showLogin = true">
          Login
        </v-btn>
      </div>

      <div v-else class="d-flex align-center ga-3">
        <v-avatar size="32">
          <v-img
            v-if="user.photoURL"
            :src="user.photoURL"
            :alt="user.displayName"
          ></v-img>
          <v-icon v-else>mdi-account</v-icon>
        </v-avatar>
        <span class="text-white">{{ user.displayName }}</span>
        <v-btn color="white" variant="text" @click="handleLogout">
          Logout
        </v-btn>
      </div>
    </v-app-bar>

    <!-- Main Content -->
    <v-main>
      <div class="pa-4">
        <slot></slot>
      </div>
    </v-main>

    <!-- Login Dialog -->
    <LoginDialog
      v-model="showLogin"
      @close="showLogin = false"
      @success="handleLoginSuccess"
    />
  </v-app>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import {
  onAuthStateChanged,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/config/firebase'
import { apiService, apiHelper, type ApiError } from '@/config/axios'
import LoginDialog from '@/components/LoginDialog.vue'
import router from '@/router'
import type { UserWithCredentials } from '@/config/user'

// Buat ref dengan tipe UserWithCredentials atau null
const user = ref<UserWithCredentials | null>(null)
const showLogin = ref(false)

const handleLoginSuccess = (userData: UserWithCredentials) => {
  user.value = userData
}

const handleLogout = async () => {
  try {
    await signOut(auth)
    user.value = null
    localStorage.removeItem('authToken')
    localStorage.removeItem('fabricToken')
    await router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const refreshFabricToken = async () => {
  try {
    if (!user.value) {
      console.warn('No user available to refresh Fabric token.')
      return
    }

    const response = await apiService.users.enrollFabricCA(
      user.value.organization,
      user.value.credentials.username,
      user.value.credentials.password
    )

    const newToken = apiHelper.getData(response).data.token
    localStorage.setItem('fabricToken', newToken)
  } catch (error) {
    console.error('Failed to refresh Fabric token:', error)
  }
}

const fetchUserData = async (firebaseUser: FirebaseUser) => {
  try {

    const idToken = await firebaseUser.getIdToken()
    localStorage.setItem('authToken', idToken)

    const response = await apiService.users.getCurrentUser()
    const userResponse = apiHelper.getData(response)

    const userData: UserWithCredentials = userResponse.data

    if (!userData) throw new Error('User data not found')

    if (!localStorage.getItem('fabricToken')) {
      const enrollFabricCAResponse = await apiService.users.enrollFabricCA(
        userData.organization,
        userData.credentials.username,
        userData.credentials.password
      )
      localStorage.setItem(
        'fabricToken',
        apiHelper.getData(enrollFabricCAResponse).data.token
      )
    }
    user.value = userData
  } catch (error: unknown) {
    console.error('Error fetching user data:', error)

    if (error instanceof Error) {
      const apiErr = error as ApiError
      const errorMessage = apiHelper.getErrorMessage(apiErr)
      if (apiErr.response?.status === 404) {
        console.error('User not found in backend - new user needs registration')
      } else {
        console.error('API Error:', errorMessage)
        user.value = null
        localStorage.removeItem('authToken')
      }
    }

    throw error
  }
}

onMounted(() => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        await fetchUserData(firebaseUser)
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    } else {
      user.value = null
      localStorage.removeItem('authToken')
    }
  })
})

// Tambahkan ini di luar watch
let refreshInterval: ReturnType<typeof setInterval> | null = null

watch(user, (newUser) => {
  if (newUser) {
    // Hapus interval lama jika ada
    if (refreshInterval) clearInterval(refreshInterval)

    refreshInterval = setInterval(
      () => {
        refreshFabricToken()
      },
      10 * 60 * 1000
    ) // 10 menit
  } else {
    // User logout, hentikan interval
    if (refreshInterval) {
      clearInterval(refreshInterval)
      refreshInterval = null
    }
  }
})

// Debug function (remove in production)
declare global {
  interface Window {
    debugAuth?: {
      getCurrentUser: () => UserWithCredentials | null
      getToken: () => string | null
      clearUser: () => void
      testFetchUser: () => Promise<void>
    }
  }
}

if (import.meta.env.VITE_APP_ENV === 'development') {
  window.debugAuth = {
    getCurrentUser: () => user.value,
    getToken: () => localStorage.getItem('authToken'),
    clearUser: () => {
      user.value = null
    },
    testFetchUser: () => fetchUserData(auth.currentUser!),
  }
}
</script>
