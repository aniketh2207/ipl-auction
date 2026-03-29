<template>
  <div class="home-page">
    <div class="hero">
      <h1 class="logo">🏏 IPL Auction</h1>
      <p class="tagline">Create a room. Pick your team. Bid to win.</p>
    </div>

    <div class="cards-container">
      <!-- Create Room -->
      <div class="card glass">
        <h2>Create Room</h2>
        <form @submit.prevent="handleCreate">
          <input
            v-model="createTeamName"
            placeholder="Your team name"
            maxlength="30"
            required
            class="input"
          />
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? "Creating..." : "Create Room" }}
          </button>
        </form>
      </div>

      <!-- Join Room -->
      <div class="card glass">
        <h2>Join Room</h2>
        <form @submit.prevent="handleJoin">
          <input
            v-model="joinRoomId"
            placeholder="Room code (e.g. AX7K2M)"
            maxlength="6"
            required
            class="input"
            style="text-transform: uppercase"
          />
          <input
            v-model="joinTeamName"
            placeholder="Your team name"
            maxlength="30"
            required
            class="input"
          />
          <button type="submit" class="btn btn-secondary" :disabled="loading">
            {{ loading ? "Joining..." : "Join Room" }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useRoomStore } from "../stores/room";

const router = useRouter();
const room = useRoomStore();

const createTeamName = ref("");
const joinRoomId = ref("");
const joinTeamName = ref("");
const loading = ref(false);

function handleCreate() {
  loading.value = true;
  room.createRoom(createTeamName.value.trim());
}

function handleJoin() {
  loading.value = true;
  room.joinRoom(joinRoomId.value.trim().toUpperCase(), joinTeamName.value.trim());
}

// Navigate to lobby when room is joined
watch(
  () => room.roomId,
  (roomId) => {
    if (roomId) {
      loading.value = false;
      router.push({ name: "Lobby", params: { roomId } });
    }
  }
);

// Reset loading on error
watch(
  () => room.error,
  (err) => {
    if (err) loading.value = false;
  }
);
</script>
