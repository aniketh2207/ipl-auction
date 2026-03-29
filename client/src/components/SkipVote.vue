<template>
  <div class="skip-vote" v-if="auction.currentPlayer && !auction.currentBid">
    <button
      class="btn btn-skip"
      @click="auction.voteSkip()"
      :disabled="room.status === 'paused'"
    >
      Skip Player ({{ auction.skipVotes.received }}/{{ auction.skipVotes.needed }})
    </button>
    <p class="skip-hint">All teams must vote to skip</p>
  </div>
</template>

<script setup>
import { useRoomStore } from "../stores/room";
import { useAuctionStore } from "../stores/auction";

const room = useRoomStore();
const auction = useAuctionStore();
</script>
