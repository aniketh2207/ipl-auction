<template>
  <div class="team-purse" :class="{ 'is-bidder': isHighestBidder, 'is-me': isMe }">
    <div class="team-header">
      <span class="team-name">{{ team.name }}</span>
      <span v-if="isMe" class="badge-me">You</span>
    </div>
    <div class="team-stats">
      <span class="purse">₹{{ formatPrice(team.purse) }}</span>
      <span class="squad-count">{{ team.squadCount }}/25 👥</span>
      <span class="overseas-count" v-if="team.overseasCount">{{ team.overseasCount }}/8 🌍</span>
    </div>
  </div>
</template>

<script setup>
defineProps({
  team: { type: Object, required: true },
  isHighestBidder: { type: Boolean, default: false },
  isMe: { type: Boolean, default: false },
});

function formatPrice(lakhs) {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs} L`;
}
</script>
