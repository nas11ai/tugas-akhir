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

<script setup>
import { ref, onMounted } from 'vue'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/config/firebase'
import { apiService, apiHelper } from '@/config/axios'
import LoginDialog from '@/components/LoginDialog.vue'
import router from '@/router'

const user = ref(null)
const showLogin = ref(false)

const handleLoginSuccess = (userData) => {
  console.log('Login successful, setting user data:', userData)
  user.value = userData
}

const handleLogout = async () => {
  try {
    // Sign out from Firebase
    await signOut(auth)

    // Clear user data
    user.value = null

    // Clear auth token
    localStorage.removeItem('authToken')

    // Clear fabric token
    localStorage.removeItem('fabricToken')

    console.log('Logout successful')

    await router.push('/')
  } catch (error) {
    console.error('Logout error:', error)
  }
}

const fetchUserData = async (firebaseUser) => {
  try {
    console.log('Fetching user data for:', firebaseUser.email)

    const idToken = await firebaseUser.getIdToken()
    // TODO: handle firebase token for auth
    localStorage.setItem('authToken', idToken)

    const response = await apiService.users.getCurrentUser()

    const userResponse = apiHelper.getData(response)

    const userData = userResponse.data

    if (!userData) {
      throw new Error('User data not found')
    }

    if (!localStorage.getItem('fabricToken')) {
      const enrollFabricCAResponse = await apiService.users.enrollFabricCA(userData.organization, userData.credentials.username, userData.credentials.password)

      localStorage.setItem('fabricToken', enrollFabricCAResponse.data.token)
    }

    console.log('User data fetched successfully:', userData)
    user.value = userData
  } catch (error) {
    console.error('Error fetching user data:', error)

    const errorMessage = apiHelper.getErrorMessage(error)

    if (error.response?.status === 404) {
      console.log('User not found in backend - new user needs registration')
    } else {
      console.error('API Error:', errorMessage)

      user.value = null
      localStorage.removeItem('authToken')
    }
  }
}

// Listen to Firebase auth state changes
onMounted(() => {
  console.log('Setting up auth state listener...')

  onAuthStateChanged(auth, async (firebaseUser) => {
    console.log(
      'Auth state changed:',
      firebaseUser ? 'User signed in' : 'User signed out'
    )

    if (firebaseUser) {
      try {
        await fetchUserData(firebaseUser)
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    } else {
      // User signed out
      console.log('User signed out, clearing data')
      user.value = null
      localStorage.removeItem('authToken')
    }
  })
})

// Debug function (remove in production)
if (import.meta.env.VITE_APP_ENV === 'development') {
  // Make debug functions available in console
  window.debugAuth = {
    getCurrentUser: () => user.value,
    getToken: () => localStorage.getItem('authToken'),
    clearUser: () => {
      user.value = null
    },
    testFetchUser: () => fetchUserData(auth.currentUser),
  }
}
</script>
