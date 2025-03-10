<!-- eslint-disable vue/multi-word-component-names -->
<template>
  <BaseLayout>
    <div class="d-flex flex-column justify-center align-center pt-16 ga-4">
      <v-img :src="logo" alt="logo ITK" width="200" height="200"></v-img>
      <h1 class="text-h1 mt-4">Lorem Ipsum</h1>
      <p class="text-body-1">"Neque porro quisquam est qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
        velit..."</p>

      <!-- Search Bar -->
      <v-text-field v-model="searchQuery" label="Search" variant="outlined" prepend-inner-icon="mdi-magnify"
        class="mt-4 w-100 w-md-50" clearable></v-text-field>
    </div>
  </BaseLayout>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import BaseLayout from '@/layouts/BaseLayout.vue';
import logo from '@/assets/logo.png';

const searchQuery = ref('');
defineExpose({ searchQuery });
</script>
