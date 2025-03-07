<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <v-overlay :model-value="overlay" class="align-center justify-center">
      <v-progress-circular color="primary" size="64" indeterminate />
    </v-overlay>
    <v-container fluid class="d-flex pa-0">
      <!-- Bagian Kiri (Gambar) -->
      <v-container class="d-none d-sm-flex align-center justify-center bg-primary h-screen w-75">
        <v-img :src="landingPageImage" alt="Login Image" contain max-height="500" />
      </v-container>

      <!-- Bagian Kanan (Form Login) -->
      <v-container class="d-flex align-center justify-center h-screen w-100 sm-w-50">
        <v-card class="pa-6 bg-white" width="400">
          <v-card-title class="text-center my-4"> Selamat Datang </v-card-title>
          <v-card-text>
            <v-btn block color="primary" @click="console.log('clicked')">
              <div class="d-flex align-center justify-center">
                <span class="text-center">Login dengan Google</span>
                <v-img :src="googleIcon" alt="Google Logo" contain height="24" width="24" class="ml-2" />
              </div>
            </v-btn>
          </v-card-text>
        </v-card>
      </v-container>
    </v-container>
  </BaseLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import landingPageImage from '@/assets/landing_page.svg';
import googleIcon from '@/assets/icons8-google.svg';
import BaseLayout from '@/layouts/BaseLayout.vue';

const overlay = ref(false);
</script>
