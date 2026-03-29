<template>
  <div class="set-selector">
    <div class="selector-header">
      <h3>Player Sets</h3>
      <div class="selector-actions">
        <button class="btn-link" @click="selectAll">All</button>
        <span class="divider">|</span>
        <button class="btn-link" @click="selectNone">None</button>
      </div>
    </div>
    <p class="selector-hint">Choose which player categories to include in the auction</p>

    <div class="set-grid">
      <label
        v-for="set in availableSets"
        :key="set.setNo"
        class="set-chip"
        :class="{
          active: isSelected(set.setNo),
          batter: set.role === 'BATTER',
          bowler: set.role === 'BOWLER',
          allrounder: set.role === 'ALL-ROUNDER',
          wicketkeeper: set.role === 'WICKETKEEPER',
        }"
      >
        <input
          type="checkbox"
          :checked="isSelected(set.setNo)"
          @change="toggleSet(set.setNo)"
          class="set-checkbox"
        />
        <div class="chip-content">
          <span class="chip-label">{{ set.label }}</span>
          <span class="chip-count">{{ set.count }} players</span>
        </div>
      </label>
    </div>

    <div class="selector-footer">
      <span class="total-players" :class="{ 'warn-none': totalSelectedPlayers === 0 }">
        {{ totalSelectedPlayers === 0 ? '⚠ No players selected' : `${totalSelectedPlayers} players selected` }}
      </span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoomStore } from "../stores/room";
import { socket } from "../socket";

const room = useRoomStore();
const availableSets = ref([]);

onMounted(() => {
  socket.emit("room:get-sets", {}, (res) => {
    if (res?.sets) availableSets.value = res.sets;
  });
});

/**
 * selectedSets convention:
 *   null / [] = ALL sets (default)
 *   [1, 3, 5] = only those set numbers included
 */

function isSelected(setNo) {
  const s = room.settings.selectedSets;
  if (!s || s.length === 0) return true;
  return s.includes(setNo);
}

function getSelectedList() {
  const s = room.settings.selectedSets;
  if (!s || s.length === 0) return availableSets.value.map((x) => x.setNo);
  return [...s];
}

function toggleSet(setNo) {
  let current = getSelectedList();
  if (current.includes(setNo)) {
    current = current.filter((n) => n !== setNo);
  } else {
    current.push(setNo);
  }
  // If all are checked, collapse to [] (= "all" default)
  const allNos = availableSets.value.map((x) => x.setNo);
  const isAll = allNos.length > 0 && allNos.every((n) => current.includes(n));
  room.updateSettings({ selectedSets: isAll ? [] : current });
}

function selectAll() {
  room.updateSettings({ selectedSets: [] });
}

function selectNone() {
  // Store all set numbers except everything — use [-1] as "none"
  // Since set numbers start at 1, [-1] won't match any.
  room.updateSettings({ selectedSets: [-1] });
}

const totalSelectedPlayers = computed(() => {
  const s = room.settings.selectedSets;
  if (!s || s.length === 0) {
    return availableSets.value.reduce((sum, x) => sum + x.count, 0);
  }
  return availableSets.value
    .filter((x) => s.includes(x.setNo))
    .reduce((sum, x) => sum + x.count, 0);
});
</script>
