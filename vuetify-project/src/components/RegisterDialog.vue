<template>
  <v-dialog v-model="dialog" max-width="500" persistent>
    <v-card>
      <v-card-title class="text-center">
        <span class="text-h5">Register New User</span>
      </v-card-title>

      <v-form @submit.prevent="handleRegister" ref="form">
        <v-card-text>
          <v-text-field
            v-model="formData.email"
            label="Email"
            type="email"
            :rules="emailRules"
            required
          ></v-text-field>

          <v-text-field
            v-model="formData.displayName"
            label="Display Name"
            :rules="nameRules"
            required
          ></v-text-field>

          <v-select
            v-model="formData.role"
            :items="roles"
            label="Role"
            :rules="roleRules"
            required
          ></v-select>

          <v-select
            v-model="formData.organization"
            :items="organizations"
            label="Organization"
            :rules="organizationRules"
            required
          ></v-select>

          <v-divider class="my-4"></v-divider>

          <v-text-field
            v-model="formData.username"
            label="Fabric Username"
            :rules="usernameRules"
            required
            hint="Username for Hyperledger Fabric network access"
          ></v-text-field>

          <v-text-field
            v-model="formData.password"
            label="Fabric Password"
            type="password"
            :rules="passwordRules"
            required
            hint="Password for Hyperledger Fabric network access"
          ></v-text-field>

          <v-alert v-if="error" type="error" class="mb-3">
            {{ error }}
          </v-alert>

          <v-alert v-if="success" type="success" class="mb-3">
            {{ success }}
          </v-alert>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="grey"
            variant="text"
            @click="$emit('close')"
            :disabled="loading"
          >
            Cancel
          </v-btn>
          <v-btn color="primary" type="submit" :loading="loading">
            Register
          </v-btn>
        </v-card-actions>
      </v-form>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { apiService } from '@/config/axios'

const props = defineProps({
  modelValue: Boolean,
})

const emit = defineEmits(['update:modelValue', 'close', 'success'])

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const form = ref()
const loading = ref(false)
const error = ref('')
const success = ref('')

const formData = reactive({
  email: '',
  displayName: '',
  role: '',
  organization: '',
  username: '',
  password: '',
  uid: '', // Will be generated from Firebase
})

const roles = ['user', 'admin']
const organizations = ['Akademik', 'Rektor'] // Sesuaikan dengan organisasi di Fabric network mu

const emailRules = [
  (v) => !!v || 'Email is required',
  (v) => /.+@.+\..+/.test(v) || 'Email must be valid',
]

const nameRules = [
  (v) => !!v || 'Display name is required',
  (v) => v.length >= 2 || 'Display name must be at least 2 characters',
]

const roleRules = [(v) => !!v || 'Role is required']

const organizationRules = [(v) => !!v || 'Organization is required']

const usernameRules = [
  (v) => !!v || 'Fabric username is required',
  (v) => v.length >= 3 || 'Username must be at least 3 characters',
]

const passwordRules = [
  (v) => !!v || 'Fabric password is required',
  (v) => v.length >= 6 || 'Password must be at least 6 characters',
]

const handleRegister = async () => {
  const { valid } = await form.value.validate()
  if (!valid) return

  loading.value = true
  error.value = ''
  success.value = ''

  try {
    // Step 1: Create user with Firebase Auth to get UID
    const { signInWithPopup, GoogleAuthProvider } = await import(
      'firebase/auth'
    )
    const { auth } = await import('@/config/firebase')

    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const firebaseUser = result.user

    // Get ID token for backend authentication
    const idToken = await firebaseUser.getIdToken()
    formData.uid = firebaseUser.uid
    formData.email = firebaseUser.email
    formData.displayName = firebaseUser.displayName || formData.displayName

    // Step 2: Create user in backend menggunakan apiService
    await apiService.users.create(
      {
        uid: formData.uid,
        email: formData.email,
        displayName: formData.displayName,
        photoURL: firebaseUser.photoURL,
        role: formData.role,
        organization: formData.organization,
        isActive: true,
      },
      idToken
    )

    // Step 3: Set user credentials for Fabric menggunakan apiService
    await apiService.users.setCredentials(
      formData.uid,
      {
        username: formData.username,
        password: formData.password,
      },
      idToken
    )

    success.value = 'User registered successfully! You can now login.'

    setTimeout(() => {
      emit('success')
      emit('close')
    }, 2000)
  } catch (err) {
    console.error('Registration error:', err)

    // Handle axios error response
    if (err.response) {
      // Server responded with error status
      error.value =
        err.response.data?.error ||
        err.response.data?.message ||
        'Failed to register user'
    } else if (err.request) {
      // Request was made but no response received
      error.value = 'Network error. Please check your connection.'
    } else {
      // Something else happened
      error.value = err.message || 'Failed to register user'
    }
  } finally {
    loading.value = false
  }
}
</script>
