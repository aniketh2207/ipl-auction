<template>
  <div class="timer-circle" :class="{ critical: remaining <= 5 }">
    <svg class="timer-svg" viewBox="0 0 100 100">
      <!-- Background circle -->
      <circle
        class="timer-track"
        cx="50" cy="50" r="42"
        fill="none"
        stroke-width="6"
      />
      <!-- Animated countdown arc -->
      <circle
        class="timer-progress"
        cx="50" cy="50" r="42"
        fill="none"
        stroke-width="6"
        stroke-linecap="round"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        transform="rotate(-90 50 50)"
      />
    </svg>
    <div class="timer-content">
      <span class="timer-number">{{ remaining }}</span>
      <span class="timer-unit">sec</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  remaining: { type: Number, default: 15 },
  total: { type: Number, default: 15 },
});

const circumference = 2 * Math.PI * 42;

const dashOffset = computed(() => {
  const ratio = props.remaining / props.total;
  return circumference * (1 - ratio);
});
</script>
