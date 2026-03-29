<template>
  <div class="my-squad-panel" :class="{ expanded: isExpanded }">
    <button class="my-squad-toggle" @click="isExpanded = !isExpanded">
      <span class="toggle-left">
        <span class="toggle-icon">👥</span>
        <span class="toggle-label">My Squad</span>
        <span class="toggle-count">{{ squad.length }}/25</span>
      </span>
      <span class="toggle-arrow" :class="{ open: isExpanded }">▾</span>
    </button>

    <Transition name="slide-squad">
      <div v-if="isExpanded" class="squad-content glass">
        <div class="squad-summary">
          <div class="squad-stat">
            <span class="stat-icon">💰</span>
            <span class="stat-text">{{ formatPrice(myTeam.purse) }}</span>
          </div>
          <div class="squad-stat">
            <span class="stat-icon">🌍</span>
            <span class="stat-text">{{ myTeam.overseasCount }}/8 OS</span>
          </div>
        </div>

        <div class="squad-player-list" v-if="squad.length > 0">
          <div
            v-for="player in squad"
            :key="player.id || player.name"
            class="squad-item"
            :class="{ overseas: player.isOverseas }"
          >
            <div class="item-info">
              <span class="item-name">{{ player.name }}</span>
              <span class="item-meta">{{ player.role }} · {{ player.country }}</span>
            </div>
            <span class="item-price">₹{{ formatPrice(player.soldPrice) }}</span>
          </div>
        </div>
        <p v-else class="squad-empty">No players bought yet</p>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed } from "vue";
import { useRoomStore } from "../stores/room";
import { useAuctionStore } from "../stores/auction";

const room = useRoomStore();
const auction = useAuctionStore();
const isExpanded = ref(false);

const myTeam = computed(() => {
  return auction.teams[room.mySocketId] || { purse: 0, squad: [], overseasCount: 0, squadCount: 0 };
});

const squad = computed(() => myTeam.value.squad || []);

function formatPrice(lakhs) {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs} L`;
}
</script>
