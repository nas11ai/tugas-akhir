<template>
  <v-app>
    <!-- Navbar -->
    <v-app-bar color="primary" scroll-behavior="hide">
      <v-toolbar-title>CertiChain</v-toolbar-title>
      <v-spacer></v-spacer>

      <div v-if="!user" class="d-flex ga-2">
        <v-btn color="white" variant="outlined" @click="showLogin = true">
          Login
        </v-btn>
        <v-btn color="accent" @click="showRegister = true"> Register </v-btn>
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

    <!-- Loading Overlay -->
    <v-overlay v-model="loading" class="align-center justify-center">
      <v-progress-circular
        color="primary"
        indeterminate
        size="64"
      ></v-progress-circular>
    </v-overlay>
  </v-app>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import LoginDialog from '@/components/LoginDialog.vue'

const user = ref(null)
const showLogin = ref(false)
const showRegister = ref(false)
const loading = ref(false)

const handleLoginSuccess = (userData) => {
  user.value = userData
  console.log('Login successful:', userData)
}

const handleLogout = async () => {
  try {
    await signOut(auth)
    user.value = null
  } catch (error) {
    console.error('Logout error:', error)
  }
}

// Listen to Firebase auth state changes
onMounted(() => {
  onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      try {
        loading.value = true
        const idToken = await firebaseUser.getIdToken()

        // Get user data from backend
        const response = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const result = await response.json()
          user.value = result.data
        } else {
          user.value = null
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
        user.value = null
      } finally {
        loading.value = false
      }
    } else {
      user.value = null
    }
  })
})
</script>
