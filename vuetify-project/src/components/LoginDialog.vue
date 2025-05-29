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
import { useRouter } from 'vue-router'

const router = useRouter()

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
    const result = await signInWithPopup(auth, googleProvider)
    const user = result.user

    const idToken = await user.getIdToken()

    localStorage.setItem('authToken', idToken)

    try {
      const response = await apiService.users.getCurrentUser()

      const userResponse = apiHelper.getData(response)
      emit('success', userResponse)
      emit('close')

      const userData = userResponse.data

      if (!userData) {
        throw new Error('User data not found')
      }

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

      await router.push('/ijazah')
    } catch (apiError) {
      const errorMessage = apiHelper.getErrorMessage(apiError)

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
