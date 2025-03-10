<template>
    <BaseLayout>
        <v-container fluid class="mt-4">
            <!-- Tombol Kembali -->
            <v-btn color="blue" outlined @click="goBack">Kembali</v-btn>

            <!-- Gambar Sertifikat -->
            <v-row class="my-4">
                <v-col cols="12">
                    <v-sheet class="pa-4" outlined>
                        <v-img aspect-ratio="16/9" cover class="w-100" max-height="500"
                            src="https://cdn.vuetifyjs.com/images/parallax/material.jpg" />
                    </v-sheet>
                </v-col>
            </v-row>

            <!-- Detail Sertifikat -->
            <v-row>
                <v-col cols="12" class="text-center mt-16">
                    <h3 class="font-weight-bold">Detail Sertifikat Ijazah</h3>
                </v-col>
            </v-row>

            <v-row class="mt-4">
                <v-col v-for="(item, index) in 6" :key="index" cols="12" md="4">
                    <v-card outlined class="pa-4">
                        <v-card-title class="text-uppercase font-weight-bold">Label</v-card-title>
                        <v-card-subtitle>Data detail here...</v-card-subtitle>
                    </v-card>
                </v-col>
            </v-row>
        </v-container>
    </BaseLayout>
</template>

<script lang="ts" setup>
import BaseLayout from '@/layouts/BaseLayout.vue';

const goBack = () => {
    console.log("Kembali ditekan");
};
</script>
