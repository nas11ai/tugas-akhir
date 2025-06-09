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

<script lang="ts" setup>
import { ref, computed } from 'vue'
import { auth, googleProvider, signInWithPopup } from '@/config/firebase'
import { apiService, apiHelper, type ApiError } from '@/config/axios'
import { useRouter } from 'vue-router'
import { FirebaseError } from 'firebase/app'

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
    const user = await signInAndGetUser()
    const idToken = await user.getIdToken()

    localStorage.setItem('authToken', idToken)

    await handleUserAuthentication()
    await router.push('/ijazah')
  } catch (err) {
    handleSignInError(err)
  } finally {
    loading.value = false
  }
}

const signInAndGetUser = async () => {
  const result = await signInWithPopup(auth, googleProvider)
  return result.user
}

const handleUserAuthentication = async () => {
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

    const fabricToken = apiHelper.getData(enrollFabricCAResponse).data.token
    localStorage.setItem('fabricToken', fabricToken)
  }
}

const handleSignInError = (err: unknown) => {
  if (err instanceof FirebaseError) {
    console.error('Firebase login error:', err)
    error.value = err.message || 'Failed to sign in with Google'
  } else if (err instanceof Error) {
    const apiErr = err as ApiError
    const message = apiHelper.getErrorMessage(apiErr)

    if (apiErr.response?.status === 404) {
      error.value =
        'User not found. Please contact admin to register your account.'
    } else {
      error.value = message
    }

    localStorage.removeItem('authToken')
  } else {
    error.value = 'An unexpected error occurred during sign in'
  }
}
</script>
