<template>
  <div class="results-page">
    <h1>🏆 Auction Results</h1>

    <!-- Summary stats -->
    <div class="results-summary">
      <div class="stat-card glass" v-for="stat in summaryStats" :key="stat.label">
        <span class="stat-value">{{ stat.value }}</span>
        <span class="stat-label">{{ stat.label }}</span>
      </div>
    </div>

    <!-- Team squads -->
    <div class="squads-grid">
      <div
        v-for="team in teamResults"
        :key="team.id"
        class="squad-card glass"
      >
        <div class="squad-header">
          <h2>{{ team.name }}</h2>
          <div class="squad-meta">
            <span>💰 ₹{{ formatPrice(team.purse) }} remaining</span>
            <span>👥 {{ team.squadCount }} players</span>
            <span>🌍 {{ team.overseasCount }} overseas</span>
          </div>
        </div>
        <div class="squad-list">
          <div
            v-for="player in team.squad"
            :key="player.id"
            class="squad-player"
            :class="{ overseas: player.isOverseas }"
          >
            <div class="player-info">
              <span class="player-name">{{ player.name }}</span>
              <span class="player-meta">{{ player.role }} · {{ player.country }}</span>
            </div>
            <span class="player-price">₹{{ formatPrice(player.soldPrice) }}</span>
          </div>
          <p v-if="!team.squad?.length" class="empty-squad">No players bought</p>
        </div>
        <div class="squad-total">
          Total spent: ₹{{ formatPrice(10000 - team.purse) }}
        </div>
      </div>
    </div>

    <div class="results-actions">
      <button class="btn btn-primary" @click="$router.push('/')">
        Back to Home
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useAuctionStore } from "../stores/auction";

const auction = useAuctionStore();

const teamResults = computed(() =>
  Object.entries(auction.teams).map(([id, t]) => ({ id, ...t }))
);

const summaryStats = computed(() => {
  const teams = teamResults.value;
  const totalSold = teams.reduce((sum, t) => sum + (t.squad?.length || 0), 0);
  const totalSpent = teams.reduce((sum, t) => sum + (10000 - t.purse), 0);
  const highestBuy = teams.reduce((max, t) => {
    const teamMax = (t.squad || []).reduce((m, p) => Math.max(m, p.soldPrice || 0), 0);
    return Math.max(max, teamMax);
  }, 0);

  return [
    { label: "Players Sold", value: totalSold },
    { label: "Unsold", value: auction.unsoldCount },
    { label: "Total Spent", value: `₹${formatPrice(totalSpent)}` },
    { label: "Highest Buy", value: `₹${formatPrice(highestBuy)}` },
  ];
});

function formatPrice(lakhs) {
  if (lakhs >= 100) return `${(lakhs / 100).toFixed(2)} Cr`;
  return `${lakhs} L`;
}
</script>
