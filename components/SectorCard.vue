<template>
  <div class="sector-card" :data-sym="s.sym" :title="s.name">
    <!-- Mobile Row -->
    <div class="sc-row">
      <div class="scr-sym">
        <span class="scr-ticker">{{ s.sym }}</span>
        <span class="scr-name">{{ s.name }}</span>
      </div>
      <div class="scr-price">{{ formatNumber(currentPrice, 2) }}</div>
      <div :class="['scr-chg', chgCls]">{{ chgStr }}</div>
      <div class="ixr-score">
        <span class="ixr-sv" :style="{ color: scoreColor(s.weekly) }">{{ s.weekly ?? '' }}</span>
        <span class="ixr-sl">W</span>
      </div>
      <div class="ixr-score">
        <span class="ixr-sv" :style="{ color: scoreColor(s.daily) }">{{ s.daily ?? '' }}</span>
        <span class="ixr-sl">D</span>
      </div>
    </div>

    <!-- Desktop Row 1 -->
    <div class="row1">
      <div>
        <div class="tkr">{{ s.sym }}</div>
        <div class="name">{{ s.name }}</div>
      </div>
      <div class="score-pill" :style="{ background: computedColor }">{{ computedScore ?? '' }}</div>
    </div>
    
    <div class="bar-wrap">
      <div class="bar" :style="{ width: `${computedScore ?? 0}%`, background: computedColor }"></div>
    </div>
    
    <div class="sc-detail" style="display:flex; justify-content:space-between; margin-top:8px; font-size:11px; color:var(--text-dim);">
      <span>{{ t('card.price') }} <span style="font-family:var(--mono); font-weight:600; color:var(--text-soft);">{{ formatNumber(currentPrice, 2) }}</span></span>
      <span :class="chgCls" style="font-family:var(--mono); font-weight:700;">{{ chgStr }}</span>
    </div>
    
    <div class="sc-detail" style="display:flex; justify-content:space-between; margin-top:4px; font-size:11px; color:var(--text-dim);">
      <span>{{ t('card.daily') }} <span :style="{ color: scoreColor(s.daily) }" style="font-family:var(--mono); font-weight:700;">{{ s.daily ?? '' }}</span></span>
      <span>{{ t('card.weekly') }} <span :style="{ color: scoreColor(s.weekly) }" style="font-family:var(--mono); font-weight:700;">{{ s.weekly ?? '' }}</span></span>
    </div>
    
    <div class="sc-detail" style="display:flex; justify-content:space-between; margin-top:4px; font-size:11px; color:var(--text-dim);">
      <span>{{ t('card.volume') }} <span style="color:var(--text-soft); font-family:var(--mono); font-weight:600;">{{ formatVolume(s.volume) }}</span></span>
      <span>{{ t('card.vol_ratio') }} <span :style="{ color: (s.volRatio || 0) > 1.5 ? 'var(--score-100)' : 'var(--text-soft)' }" style="font-family:var(--mono); font-weight:700;">{{ s.volRatio ? s.volRatio.toFixed(2) : '—' }}</span></span>
    </div>
    
    <div class="card-history history-col">
      <div class="heat-row"><span class="hl">W</span><HeatStrip :history="s.history_weekly || []" /></div>
      <div class="heat-row"><span class="hl">D</span><HeatStrip :history="s.history_daily || []" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  s: any;
}>();

const { t } = useI18n();
const { tf, scoreColor } = useScores();
const { prices } = usePrices();

const currentPrice = computed(() => prices.value[props.s.sym]?.price || props.s.price || 0);
const currentChg = computed(() => prices.value[props.s.sym]?.chg || props.s.chg || 0);

const computedScore = computed(() => props.s[tf.value] ?? null);
const computedColor = computed(() => scoreColor(computedScore.value ?? 0));
const chgCls = computed(() => currentChg.value >= 0 ? 'delta-up' : 'delta-down');
const chgStr = computed(() => `${currentChg.value >= 0 ? '▲' : '▼'} ${Math.abs(currentChg.value).toFixed(2)}%`);

const formatNumber = (n: number, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const formatVolume = (n: number) => {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n;
};
</script>
