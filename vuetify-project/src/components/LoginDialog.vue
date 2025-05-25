<!-- components/LoginDialog.vue -->
<template>
  <v-dialog v-model="dialog" max-width="400" persistent>
    <v-card>
      <v-card-title class="text-center">
        <span class="text-h5">Login to CertiChain</span>
      </v-card-title>
      <v-card-text>
        <div class="text-center mb-4">
          <v-btn
            color="primary"
            size="large"
            variant="outlined"
            prepend-icon="mdi-google"
            @click="signInWithGoogle"
            :loading="loading"
            block
          >
            Sign in with Google
          </v-btn>
        </div>
        <v-alert v-if="error" type="error" class="mb-3">
          {{ error }}
        </v-alert>
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="grey" variant="text" @click="$emit('close')">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'
import { auth, googleProvider, signInWithPopup } from '@/config/firebase'
import { apiService, apiHelper } from '@/config/axios'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'close', 'success'])

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const loading = ref(false)
const error = ref('')

const signInWithGoogle = async () => {
  loading.value = true
  error.value = ''

  try {
    // Sign in with Firebase
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    // Get Firebase ID token
    const idToken = await user.getIdToken()

    // Store token in localStorage for axios interceptor
    localStorage.setItem('authToken', idToken)

    try {
      // Use axios service to check if user exists in backend
      const response = await apiService.users.getCurrentUser()

      // Handle successful response
      const userData = apiHelper.getData(response)
      emit('success', userData)
      emit('close')
    } catch (apiError) {
      // Handle API errors using helper
      const errorMessage = apiHelper.getErrorMessage(apiError)

      // Check if it's a 404 (user not found)
      if (apiError.response?.status === 404) {
        error.value =
          'User not found. Please contact admin to register your account.'
      } else {
        error.value = errorMessage
      }

      // Remove token from localStorage on API error
      localStorage.removeItem('authToken')
    }
  } catch (firebaseError) {
    console.error('Firebase login error:', firebaseError)
    error.value = firebaseError.message || 'Failed to sign in with Google'
  } finally {
    loading.value = false
  }
}
</script>
