<template>
  <div class="lobby-page">
    <div class="lobby-header">
      <h1>🏏 Auction Lobby</h1>
      <div class="room-code glass">
        <span class="label">Room Code</span>
        <span class="code">{{ roomId }}</span>
        <button class="btn-icon" @click="copyCode" :title="copied ? 'Copied!' : 'Copy'">
          {{ copied ? "✓" : "📋" }}
        </button>
      </div>
    </div>

    <div class="lobby-content">
      <!-- Teams list -->
      <div class="teams-panel glass">
        <h2>Teams ({{ room.teamCount }}/10)</h2>
        <div class="team-list">
          <div
            v-for="team in room.teamList"
            :key="team.id"
            class="team-item"
            :class="{ creator: team.id === room.creatorId, me: team.id === room.mySocketId }"
          >
            <span class="team-name">{{ team.name }}</span>
            <span v-if="team.id === room.creatorId" class="badge">Host</span>
            <span v-if="team.id === room.mySocketId" class="badge you">You</span>
          </div>
        </div>
        <p v-if="room.teamCount < 2" class="waiting-text">
          Waiting for at least 1 more team to join...
        </p>
      </div>

      <!-- Settings (creator only) -->
      <div v-if="room.isCreator" class="settings-panel glass">
        <h2>Settings</h2>
        <label class="toggle-row">
          <span>Accelerated Round (unsold players)</span>
          <input
            type="checkbox"
            :checked="room.settings.acceleratedRound"
            @change="room.updateSettings({ acceleratedRound: $event.target.checked })"
          />
        </label>

        <!-- Set Selector -->
        <SetSelector />

        <button
          class="btn btn-primary btn-large"
          :disabled="room.teamCount < 2"
          @click="startAuction"
        >
          Start Auction 🏏
        </button>
      </div>

      <div v-else class="settings-panel glass">
        <h2>Waiting for host to start...</h2>
        <div class="loader"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useRoomStore } from "../stores/room";
import { useAuctionStore } from "../stores/auction";
import SetSelector from "../components/SetSelector.vue";

const props = defineProps(["roomId"]);
const router = useRouter();
const room = useRoomStore();
const auction = useAuctionStore();
const copied = ref(false);

function copyCode() {
  navigator.clipboard.writeText(props.roomId);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

function startAuction() {
  auction.startAuction();
}

// Navigate to auction when it starts
watch(
  () => room.status,
  (status) => {
    if (status === "in_progress") {
      router.push({ name: "Auction", params: { roomId: props.roomId } });
    }
  }
);
</script>
