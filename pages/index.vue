<template>
  <section class="view visible">
    
    <div class="score-intro" id="score-intro">
      <div class="score-intro-label">{{ t('score-intro.label') }}<span class="score-intro-chevron">▶</span></div>
      <p v-html="t('score-intro.body')"></p>
      <p style="margin-top: 8px;"><strong>{{ t('hint.score') }}</strong></p>
    </div>

    <div class="section-head">
      <div class="right">
        <button id="history-toggle" class="btn active mobile-hidden" title="Show/hide 20-point score history heatmap">
          <span>⬚</span> History
        </button>
      </div>
    </div>
    
    <div class="indexes" id="indexes-wrap">
      <IndexCard v-for="ix in indexes" :key="ix.sym" :ix="ix" />
    </div>

    <div class="section-head">
      <button id="sectors-toggle" style="margin-left:auto; padding: 4px 8px; font-size: 12px; display: none;" class="sectors-toggle">Show</button>
    </div>
    
    <div class="sectors" id="sectors-wrap">
      <SectorCard v-for="s in sortedSectors" :key="s.sym" :s="s" />
    </div>
    
    <div class="legend">
      <span><span class="swatch" style="background:var(--score-0)"></span><span>{{ t('legend.strong_bearish') }}</span></span>
      <span><span class="swatch" style="background:var(--score-25)"></span><span>{{ t('legend.bearish') }}</span></span>
      <span><span class="swatch" style="background:var(--score-50)"></span><span>{{ t('legend.neutral') }}</span></span>
      <span><span class="swatch" style="background:var(--score-75)"></span><span>{{ t('legend.bullish') }}</span></span>
      <span><span class="swatch" style="background:var(--score-100)"></span><span>{{ t('legend.strong_bullish') }}</span></span>
    </div>

    <div class="section-head">
      <div class="hint"><span>{{ t('hint.sorted_by') }}</span> <span style="text-transform: capitalize;">{{ t('th.' + sortKey) || sortKey }} ({{ sortDir }})</span></div>
    </div>
    
    <div class="inner-tabs">
      <button :class="{ active: idx === 'ndx' }" @click="idx = 'ndx'">{{ t('idx.ndx') }}</button>
      <button :class="{ active: idx === 'spx' }" @click="idx = 'spx'">{{ t('idx.spx') }}</button>
      <button :class="{ active: idx === 'hot100' }" @click="idx = 'hot100'">{{ t('idx.hot100') }}</button>
      <div class="spacer"></div>
      <input class="search" v-model="query" :placeholder="t('search.placeholder')" />
    </div>
    
    <div class="table-wrap">
      <div class="scroll-body">
        <table class="stocks" id="stocks-table">
          <thead>
            <tr>
              <th @click="setSort('sym')">{{ t('th.ticker') }} <span v-if="sortKey === 'sym'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('name')" class="mobile-hidden">{{ t('th.name') }} <span v-if="sortKey === 'name'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('sector')" class="mobile-hidden">{{ t('th.sector') }} <span v-if="sortKey === 'sector'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('capCategory')" class="mobile-hidden">{{ t('th.cap') }} <span v-if="sortKey === 'capCategory'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('volume')" class="num mobile-hidden" style="text-align:right">{{ t('th.volume') }} <span v-if="sortKey === 'volume'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('volRatio')" class="num mobile-hidden" style="text-align:right">{{ t('th.volRatio') }} <span v-if="sortKey === 'volRatio'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('weekly')" class="num" style="text-align:right">{{ t('tf.weekly') }} <span v-if="sortKey === 'weekly'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('chg2w')" class="num mobile-hidden" style="text-align:right">2W&thinsp;Δ <span v-if="sortKey === 'chg2w'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th class="num history-col" style="text-align:right"><span style="font-size:10px; letter-spacing:.06em; color:var(--text-dim);">←&thinsp;20W</span></th>
              <th @click="setSort('daily')" class="num" style="text-align:right">{{ t('tf.daily') }} <span v-if="sortKey === 'daily'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('chg2d')" class="num mobile-hidden" style="text-align:right">2D&thinsp;Δ <span v-if="sortKey === 'chg2d'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th class="num history-col" style="text-align:right"><span style="font-size:10px; letter-spacing:.06em; color:var(--text-dim);">←&thinsp;20D</span></th>
              <th @click="setSort('price')" class="num" style="text-align:right">{{ t('th.price') }} <span v-if="sortKey === 'price'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
              <th @click="setSort('chg')" class="num" style="text-align:right">{{ t('th.chg') }} <span v-if="sortKey === 'chg'" class="arrow">{{ sortDir === 'asc' ? '▲' : '▼' }}</span></th>
            </tr>
          </thead>
          <tbody>
            <StockRow v-for="(r, index) in pageRows" :key="r.sym" :r="r" :rank="startIndex + index + 1" />
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button class="page-btn" :disabled="page <= 1" @click="prevPage">← Prev</button>
        <span class="page-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="nextPage">Next →</button>
        <div class="page-sizes">
          <button :class="['ps-btn', { active: pageSize === 50 }]" @click="setPageSize(50)">50</button>
          <button :class="['ps-btn', { active: pageSize === 100 }]" @click="setPageSize(100)">100</button>
          <button :class="['ps-btn', { active: pageSize === 0 }]" @click="setPageSize(0)">All</button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';

const { t } = useI18n();
const { 
  data, 
  startPolling: startScoresPolling, 
  stopPolling: stopScoresPolling,
  tf, idx, sortKey, sortDir, query, page, pageSize,
  calc2wChg, calc2dChg
} = useScores();

const { startPolling: startPricesPolling, stopPolling: stopPricesPolling } = usePrices();

onMounted(() => {
  startScoresPolling();
  startPricesPolling();
});

onUnmounted(() => {
  stopScoresPolling();
  stopPricesPolling();
});

const indexes = computed(() => data.value?.indexes || []);
const sectors = computed(() => data.value?.sectors || []);

const sortedSectors = computed(() => {
  return [...sectors.value].sort((a, b) => {
    const wDiff = (b.weekly || 0) - (a.weekly || 0);
    if (wDiff !== 0) return wDiff;
    return (b.daily || 0) - (a.daily || 0);
  });
});

const setSort = (key: string) => {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'desc';
  }
};

const setPageSize = (size: number) => {
  pageSize.value = size;
  page.value = 1;
};

const matchPriority = (r: any, q: string) => {
  const sym = (r.sym || '').toLowerCase();
  const name = (r.name || '').toLowerCase();
  if (sym.startsWith(q)) return 0;
  if (name.startsWith(q)) return 1;
  if (sym.includes(q)) return 2;
  return 3;
};

const sortedStocks = computed(() => {
  const list = data.value?.stocks?.[idx.value] || [];
  const q = query.value.trim().toLowerCase();
  const dir = sortDir.value === 'asc' ? 1 : -1;
  const k = sortKey.value;

  const sorted = [...list].sort((a: any, b: any) => {
    let av, bv;
    if (k === 'chg2w') { av = calc2wChg(a) ?? -999; bv = calc2wChg(b) ?? -999; }
    else if (k === 'chg2d') { av = calc2dChg(a) ?? -999; bv = calc2dChg(b) ?? -999; }
    else { av = a[k]; bv = b[k]; }

    if (typeof av === 'string') {
      const cmp = (av || '').localeCompare(bv || '');
      return cmp !== 0 ? cmp * dir : 0;
    }
    
    const diff = (av || 0) - (bv || 0);
    if (diff !== 0) return diff * dir;
    
    if (k === 'weekly') {
      const dailyDiff = (a.daily || 0) - (b.daily || 0);
      return dir === 1 ? dailyDiff : -dailyDiff;
    }
    return 0;
  });

  if (q) {
    return sorted
      .filter((r: any) => (r.sym || '').toLowerCase().includes(q) || (r.name || '').toLowerCase().includes(q))
      .sort((a: any, b: any) => matchPriority(a, q) - matchPriority(b, q));
  }
  return sorted;
});

const totalPages = computed(() => pageSize.value > 0 ? Math.max(1, Math.ceil(sortedStocks.value.length / pageSize.value)) : 1);
const startIndex = computed(() => pageSize.value > 0 ? (page.value - 1) * pageSize.value : 0);
const pageRows = computed(() => pageSize.value > 0 ? sortedStocks.value.slice(startIndex.value, startIndex.value + pageSize.value) : sortedStocks.value);

const prevPage = () => { if (page.value > 1) page.value--; };
const nextPage = () => { if (page.value < totalPages.value) page.value++; };
</script>
