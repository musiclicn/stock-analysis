<template>
  <div class="heat-strip">
    <span 
      v-for="(cell, i) in paddedCells" 
      :key="i"
      :class="['heat-cell', cell === null ? 'empty' : '']"
      :style="cell !== null ? { background: scoreColor(cell) } : {}"
      :title="cell !== null ? String(cell) : '—'"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  history: number[];
  total?: number;
}>();

const { scoreColor } = useScores();
const total = props.total || 20;

const paddedCells = computed(() => {
  const pad = Math.max(0, total - props.history.length);
  const arr = Array(pad).fill(null);
  return [...arr, ...props.history];
});
</script>
