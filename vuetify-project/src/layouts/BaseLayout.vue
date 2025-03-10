<template>
    <v-app>
        <!-- Navbar -->
        <v-app-bar color="primary" scroll-behavior="hide">
            <v-toolbar-title>CertiChain</v-toolbar-title>
            <v-spacer></v-spacer>
            <v-btn v-if="!user" color="white" class="bg-accent mr-8" @click="console.log('login clicked')">Login</v-btn>
            <v-btn v-else color="white" @click="console.log('logout clicked')">Logout</v-btn>
        </v-app-bar>

        <!-- Main Content -->
        <div class="pa-16">
            <slot></slot>
        </div>
    </v-app>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const user = ref(null);
</script>
