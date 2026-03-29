<template>
  <div class="bid-panel glass">
    <button
      class="btn btn-bid"
      :disabled="!auction.canIBid || room.status === 'paused'"
      @click="auction.placeBid()"
    >
      <span class="bid-icon">🏏</span>
      <span class="bid-text">{{ bidButtonText }}</span>
    </button>

    <!-- Withdraw button -->
    <button
      v-if="canWithdraw"
      class="btn btn-withdraw"
      :disabled="room.status === 'paused'"
      @click="auction.withdrawBid()"
    >
      <span class="withdraw-icon">🚫</span>
      <span class="withdraw-text">Withdraw</span>
    </button>

    <!-- Withdraw status indicator -->
    <div v-if="auction.currentBid && auction.withdrawals.needed > 0" class="withdraw-status">
      <div class="withdraw-bar">
        <div
          class="withdraw-fill"
          :style="{ width: `${(auction.withdrawals.count / auction.withdrawals.needed) * 100}%` }"
        ></div>
      </div>
      <span class="withdraw-count">
        {{ auction.withdrawals.count }}/{{ auction.withdrawals.needed }} withdrawn
      </span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useRoomStore } from "../stores/room";
import { useAuctionStore } from "../stores/auction";

const room = useRoomStore();
const auction = useAuctionStore();

// Bid increment slabs (mirror server config)
const BID_SLABS = [
  [100, 5],
  [500, 25],
  [1000, 50],
  [Infinity, 100],
];

function getNextBid(current) {
  for (const [max, inc] of BID_SLABS) {
    if (current < max) return current + inc;
  }
}

function formatPrice(lakhs) {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs} L`;
}

const bidButtonText = computed(() => {
  if (!auction.currentPlayer) return "Waiting...";
  if (auction.currentBid?.teamId === room.mySocketId) return "You're leading!";
  if (auction.withdrawals.teams.includes(room.mySocketId)) return "Withdrawn";

  const currentAmount = auction.currentBid?.amount || auction.currentPlayer.basePrice;
  const nextAmount = auction.currentBid
    ? getNextBid(currentAmount)
    : auction.currentPlayer.basePrice;

  return `Bid ₹${formatPrice(nextAmount)}`;
});

const canWithdraw = computed(() => {
  if (!auction.currentPlayer) return false;
  if (!auction.currentBid?.teamId) return false;  // No bid yet = nothing to withdraw from
  if (auction.currentBid.teamId === room.mySocketId) return false;  // Highest bidder can't withdraw
  if (auction.withdrawals.teams.includes(room.mySocketId)) return false;  // Already withdrawn
  return true;
});
</script>
