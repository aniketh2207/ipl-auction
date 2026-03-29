<template>
  <div class="player-card glass" :class="roleClass">
    <div class="card-header">
      <span class="player-category" :class="player.category.toLowerCase()">
        {{ player.category }}
      </span>
      <span class="player-country">
        {{ player.country }}
        <span v-if="player.isOverseas" class="overseas-badge">OS</span>
      </span>
    </div>

    <div class="card-body">
      <h2 class="player-name">{{ player.name }}</h2>
      <span class="player-role">{{ player.role }}</span>

      <div class="player-details">
        <div class="detail">
          <span class="detail-label">Age</span>
          <span class="detail-value">{{ player.age }}</span>
        </div>
        <div class="detail">
          <span class="detail-label">Batting</span>
          <span class="detail-value">{{ player.battingHand }}</span>
        </div>
        <div class="detail" v-if="player.bowlingStyle">
          <span class="detail-label">Bowling</span>
          <span class="detail-value">{{ player.bowlingStyle }}</span>
        </div>
        <div class="detail">
          <span class="detail-label">IPL Caps</span>
          <span class="detail-value">{{ player.iplCaps }}</span>
        </div>
      </div>
    </div>

    <div class="card-footer">
      <div class="base-price">
        <span class="price-label">Base Price</span>
        <span class="price-value">₹{{ formatPrice(player.basePrice) }}</span>
      </div>
      <div v-if="currentBid" class="current-bid">
        <span class="bid-label">Current Bid</span>
        <span class="bid-value">₹{{ formatPrice(currentBid.amount) }}</span>
        <span class="bid-team">by {{ currentBid.teamName }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  player: { type: Object, required: true },
  currentBid: { type: Object, default: null },
});

const roleClass = computed(() => props.player.role.toLowerCase().replace("-", ""));

function formatPrice(lakhs) {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs} L`;
}
</script>
