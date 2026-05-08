<template>
  <tr :data-sym="r.sym">
    <td class="sym">
      <span style="color:var(--text-dim); font-family:var(--mono); font-size:11px; margin-right:6px; font-weight:normal;">{{ rank }}</span>{{ r.sym }}
    </td>
    <td class="name mobile-hidden">{{ r.name }}</td>
    <td class="name mobile-hidden" style="color:var(--text-dim)">{{ r.sector || '' }}</td>
    <td class="name mobile-hidden" style="color:var(--text-dim); font-size:12px;" :title="r.capCategory || ''">
      {{ r.capCategory && r.capCategory !== 'Unknown' ? r.capCategory.replace(/\s*\(.*?\)/, '') : '—' }}
    </td>
    <td class="num mobile-hidden" style="color:var(--text-soft)">{{ formatVolume(r.volume) }}</td>
    <td class="num mobile-hidden" :style="{ fontWeight: '600', color: (r.volRatio || 0) > 2 ? 'var(--score-100)' : (r.volRatio || 0) > 1.5 ? 'var(--score-75)' : 'var(--text-soft)' }">
      {{ r.volRatio ? r.volRatio.toFixed(2) : '—' }}
    </td>
    <td class="num">
      <div class="score-cell">
        <div class="score-bar mobile-hidden">
          <div :style="{ width: `${wsc}%`, background: wcol }"></div>
        </div>
        <div class="score-val" :style="{ color: wcol }">{{ wscStr }}</div>
      </div>
    </td>
    <td :class="['num mobile-hidden', d2wCls]" style="font-family:var(--mono); font-weight:600;">{{ d2wStr }}</td>
    <td class="num history-col"><HeatStrip :history="r.history_weekly || []" /></td>
    <td class="num">
      <div class="score-cell">
        <div class="score-bar mobile-hidden">
          <div :style="{ width: `${dsc}%`, background: dcol }"></div>
        </div>
        <div class="score-val" :style="{ color: dcol }">{{ dscStr }}</div>
      </div>
    </td>
    <td :class="['num mobile-hidden', d2dCls]" style="font-family:var(--mono); font-weight:600;">{{ d2dStr }}</td>
    <td class="num history-col"><HeatStrip :history="r.history_daily || []" /></td>
    <td class="num">{{ formatNumber(currentPrice, 2) }}</td>
    <td :class="['num', chgCls]">{{ currentChg >= 0 ? '+' : '' }}{{ currentChg.toFixed(2) }}%</td>
  </tr>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  r: any;
  rank: number;
}>();

const { scoreColor, calc2wChg, calc2dChg } = useScores();
const { prices } = usePrices();

const currentPrice = computed(() => prices.value[props.r.sym]?.price || props.r.price || 0);
const currentChg = computed(() => prices.value[props.r.sym]?.chg || props.r.chg || 0);
const chgCls = computed(() => currentChg.value >= 0 ? 'delta-up' : 'delta-down');

const wsc = computed(() => props.r.weekly ?? 0);
const wscStr = computed(() => props.r.weekly ?? '');
const wcol = computed(() => scoreColor(wsc.value));

const dsc = computed(() => props.r.daily ?? 0);
const dscStr = computed(() => props.r.daily ?? '');
const dcol = computed(() => scoreColor(dsc.value));

const d2w = computed(() => calc2wChg(props.r));
const d2wStr = computed(() => d2w.value === null ? '—' : (d2w.value > 0 ? '+' : '') + d2w.value);
const d2wCls = computed(() => d2w.value === null ? '' : d2w.value > 0 ? 'delta-up' : d2w.value < 0 ? 'delta-down' : '');

const d2d = computed(() => calc2dChg(props.r));
const d2dStr = computed(() => d2d.value === null ? '—' : (d2d.value > 0 ? '+' : '') + d2d.value);
const d2dCls = computed(() => d2d.value === null ? '' : d2d.value > 0 ? 'delta-up' : d2d.value < 0 ? 'delta-down' : '');

const formatNumber = (n: number, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const formatVolume = (n: number) => {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n;
};
</script>
