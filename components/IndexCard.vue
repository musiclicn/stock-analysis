<template>
  <div class="index-card" :data-sym="ix.sym">
    <!-- Mobile Row -->
    <div class="ix-row">
      <div class="ixr-sym">
        <span class="ixr-ticker">{{ ix.sym }}</span>
        <span class="ixr-name">{{ ix.name }}</span>
      </div>
      <div :class="['ixr-chg', chgCls]">{{ chgIndicator }} {{ Math.abs(currentChg).toFixed(2) }}%</div>
      <div class="ixr-price">{{ formatNumber(currentPrice, 2) }}</div>
      <div class="ixr-score">
        <span class="ixr-sv" :style="{ color: scoreColor(ix.weekly) }">{{ ix.weekly ?? '' }}</span>
        <span class="ixr-sl">W</span>
      </div>
      <div class="ixr-score">
        <span class="ixr-sv" :style="{ color: scoreColor(ix.daily) }">{{ ix.daily ?? '' }}</span>
        <span class="ixr-sl">D</span>
      </div>
      <div class="ixr-trend" :style="{ color: computedColor }">{{ t('trend.' + trendKey(computedScore)) }}</div>
    </div>

    <!-- Desktop View -->
    <div class="index-head">
      <div>
        <div class="index-title">{{ ix.name }}</div>
        <div class="index-symbol">{{ ix.sym }}</div>
      </div>
      <div style="text-align:right;">
        <div class="index-title">{{ t(tf === 'daily' ? 'card.daily_score' : 'card.weekly_score') }}</div>
        <div :class="chgCls" style="font-family:var(--mono); font-size:15px; margin-top:4px;">
          {{ chgIndicator }} {{ Math.abs(currentChg).toFixed(2) }}%
        </div>
      </div>
    </div>
    
    <div class="index-body">
      <div class="gauge mobile-hidden">
        <svg viewBox="0 0 140 140">
          <circle class="track" cx="70" cy="70" r="58" stroke-width="12" fill="none" />
          <circle class="bar" cx="70" cy="70" r="58" :stroke="computedColor" stroke-width="12" fill="none"
                  :stroke-dasharray="C" :stroke-dashoffset="offset" />
        </svg>
        <div class="label">
          <div>
            <div class="big" :style="{ color: computedColor }">{{ computedScore !== null ? computedScore : '' }}</div>
            <div class="small">/ 100</div>
          </div>
        </div>
      </div>
      
      <div class="stat-grid">
        <div class="stat"><div class="k">{{ t('card.price') }}</div><div class="v">{{ formatNumber(currentPrice, 2) }}</div></div>
        <div class="stat"><div class="k">{{ t('card.trend') }}</div><div class="v" :style="{ color: scoreColor(ix.daily) }">{{ t('trend.' + trendKey(computedScore)) }}</div></div>
        <div class="stat"><div class="k">{{ t('card.volume') }}</div><div class="v">{{ formatVolume(ix.volume) }}</div></div>
        <div class="stat">
          <div class="k">{{ t('card.vol_ratio') }}</div>
          <div class="v" :style="{ color: (ix.volRatio || 0) > 1.5 ? 'var(--score-100)' : 'var(--text)' }">
            {{ ix.volRatio ? ix.volRatio.toFixed(2) : '—' }}
          </div>
        </div>
        <div class="stat"><div class="k">{{ t('card.daily') }}</div><div class="v" :style="{ color: scoreColor(ix.daily) }">{{ ix.daily ?? '' }}</div></div>
        <div class="stat"><div class="k">{{ t('card.weekly') }}</div><div class="v" :style="{ color: scoreColor(ix.weekly) }">{{ ix.weekly ?? '' }}</div></div>
      </div>
    </div>
    
    <div class="card-history history-col">
      <div class="heat-row"><span class="hl">W</span><HeatStrip :history="ix.history_weekly || []" /></div>
      <div class="heat-row"><span class="hl">D</span><HeatStrip :history="ix.history_daily || []" /></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  ix: any;
}>();

const { t } = useI18n();
const { tf, scoreColor } = useScores();
const { prices } = usePrices();

const currentPrice = computed(() => prices.value[props.ix.sym]?.price || props.ix.price || 0);
const currentChg = computed(() => prices.value[props.ix.sym]?.chg || props.ix.chg || 0);

const computedScore = computed(() => props.ix[tf.value] ?? null);
const computedColor = computed(() => scoreColor(computedScore.value ?? 0));
const chgCls = computed(() => currentChg.value >= 0 ? 'delta-up' : 'delta-down');
const chgIndicator = computed(() => currentChg.value >= 0 ? '▲' : '▼');

const C = 2 * Math.PI * 58;
const offset = computed(() => C * (1 - (computedScore.value ?? 0) / 100));

const formatNumber = (n: number, d = 2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
const formatVolume = (n: number) => {
  if (!n) return '—';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n;
};

const trendKey = (s: number | null) => {
  if (s === null) return 'neutral';
  if (s >= 80) return 'strong_bullish';
  if (s >= 60) return 'bullish';
  if (s >= 50) return 'neutral';
  if (s >= 31) return 'bearish';
  return 'strong_bearish';
};
</script>
