<template>
  <div id="app-root">
    <router-view />
    <!-- Global error toast -->
    <Transition name="toast">
      <div v-if="room.error" class="error-toast" @click="room.clearError()">
        {{ room.error }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { onMounted } from "vue";
import { useRoomStore } from "./stores/room";
import { useAuctionStore } from "./stores/auction";

const room = useRoomStore();
const auction = useAuctionStore();

onMounted(() => {
  room.setupListeners();
  auction.setupListeners();
});
</script>
