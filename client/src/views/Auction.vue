<template>
  <div class="auction-page">
    <!-- Top bar: Set info + Timer -->
    <div class="auction-topbar">
      <div class="set-info glass" v-if="auction.setInfo">
        <span class="set-badge">Set {{ auction.setInfo.setNo }}</span>
        <span class="set-label">{{ auction.setInfo.label }}</span>
      </div>
      <div class="set-info glass" v-if="auction.isAccelerated">
        <span class="set-badge acc">ACC</span>
        <span class="set-label">Accelerated Round</span>
      </div>
      <TimerBar :remaining="auction.timerRemaining" />
      <div class="topbar-actions" v-if="room.isCreator">
        <button class="btn btn-small" @click="auction.togglePause()">
          {{ room.status === 'paused' ? '▶ Resume' : '⏸ Pause' }}
        </button>
        <button class="btn btn-small btn-end" @click="confirmEnd">
          🏁 End
        </button>
      </div>
    </div>

    <!-- Paused overlay -->
    <div v-if="room.status === 'paused'" class="paused-overlay">
      <div class="paused-content glass">
        <h2>⏸ Auction Paused</h2>
        <p v-if="room.isCreator">Click Resume to continue</p>
        <p v-else>Waiting for host to resume...</p>
      </div>
    </div>

    <!-- Main auction area -->
    <div class="auction-main">
      <!-- SOLD animation -->
      <Transition name="stamp">
        <div v-if="auction.soldAnimation" class="sold-overlay">
          <div class="sold-stamp">
            <span class="sold-text">SOLD!</span>
            <span class="sold-detail">
              {{ auction.soldAnimation.player.name }} → {{ auction.soldAnimation.teamName }}
            </span>
            <span class="sold-price">₹{{ formatPrice(auction.soldAnimation.price) }}</span>
          </div>
        </div>
      </Transition>

      <!-- UNSOLD animation -->
      <Transition name="stamp">
        <div v-if="auction.unsoldAnimation" class="unsold-overlay">
          <div class="unsold-stamp">
            <span class="unsold-text">UNSOLD</span>
            <span class="unsold-detail">{{ auction.unsoldAnimation.player.name }}</span>
          </div>
        </div>
      </Transition>

      <!-- Regular auction done — accelerated round prompt -->
      <div v-if="auction.regularDone" class="regular-done glass">
        <h2>Regular Auction Complete!</h2>
        <p>{{ auction.unsoldCount }} players went unsold.</p>
        <div v-if="room.isCreator" class="done-actions">
          <button class="btn btn-primary" @click="auction.triggerAcceleratedRound()" v-if="auction.unsoldCount > 0">
            Start Accelerated Round
          </button>
          <button class="btn btn-secondary" @click="auction.finishAuction()">
            End Auction
          </button>
        </div>
        <p v-else>Waiting for host's decision...</p>
      </div>

      <!-- Player card -->
      <PlayerCard
        v-if="auction.currentPlayer && !auction.soldAnimation && !auction.unsoldAnimation"
        :player="auction.currentPlayer"
        :currentBid="auction.currentBid"
      />
    </div>

    <!-- Bottom: Bid panel + Teams sidebar -->
    <div class="auction-bottom">
      <div class="bid-section">
        <BidPanel />
        <SkipVote />
      </div>
      <div class="teams-sidebar">
        <TeamPurse
          v-for="team in auction.teamList"
          :key="team.id"
          :team="team"
          :isHighestBidder="auction.currentBid?.teamId === team.id"
          :isMe="team.id === room.mySocketId"
        />
      </div>
    </div>

    <!-- My Squad (collapsible) -->
    <MySquad />

    <!-- Activity log -->
    <div class="activity-log glass" v-if="auction.history.length">
      <div v-for="(event, i) in [...auction.history].reverse()" :key="i" class="log-entry" :class="event.type">
        <span v-if="event.type === 'sold'">
          ✅ {{ event.player }} → {{ event.team }} for ₹{{ formatPrice(event.price) }}
        </span>
        <span v-else>❌ {{ event.player }} went unsold</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { watch, computed } from "vue";
import { useRouter } from "vue-router";
import { useRoomStore } from "../stores/room";
import { useAuctionStore } from "../stores/auction";
import PlayerCard from "../components/PlayerCard.vue";
import BidPanel from "../components/BidPanel.vue";
import SkipVote from "../components/SkipVote.vue";
import TeamPurse from "../components/TeamPurse.vue";
import TimerBar from "../components/TimerBar.vue";
import MySquad from "../components/MySquad.vue";

const props = defineProps(["roomId"]);
const router = useRouter();
const room = useRoomStore();
const auction = useAuctionStore();

// Compute the team list from auction teams (has squad data)
auction.teamList = computed(() =>
  Object.entries(auction.teams).map(([id, t]) => ({ id, ...t }))
);

function formatPrice(lakhs) {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs} L`;
}

function confirmEnd() {
  if (confirm("End the auction now? All current results will be saved.")) {
    auction.finishAuction();
  }
}

// Navigate to results when finished
watch(
  () => room.status,
  (status) => {
    if (status === "finished") {
      router.push({ name: "Results", params: { roomId: props.roomId } });
    }
  }
);
</script>
