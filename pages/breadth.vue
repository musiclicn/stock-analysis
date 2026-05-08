<template>
  <section class="view visible">
    <div class="chart-card">
      <div class="chart-head">
        <h2>{{ t('breadth.title') }}</h2>
        <div class="sub">{{ t('breadth.subtitle') }}</div>
      </div>

      <div class="range-row">
        <span class="label">{{ t('breadth.zoom') }}</span>
        <div class="range">
          <button v-for="r in ['all', '2y', '1y', 'ytd', '6m', '3m', '1m']" :key="r" 
                  :class="{ active: range === r }" @click="setRange(r)">
            {{ r.toUpperCase() }}
          </button>
        </div>
        <div class="spacer"></div>
        <span class="label">{{ t('breadth.updated') }}</span>
        <span style="font-family: var(--mono); color: var(--text-soft); font-size: 12px;">{{ formattedTime }}</span>
      </div>

      <div class="chart-wrap"><canvas ref="chartCanvas"></canvas></div>

      <div class="legend-row">
        <span class="item" :class="{ off: !visible[0] }" @click="toggleVis(0)">
          <span class="swatch" style="background:var(--price)"></span><span>{{ t('chart.sp500') }}</span>
        </span>
        <span class="item" :class="{ off: !visible[1] }" @click="toggleVis(1)">
          <span class="swatch" style="background:var(--ma50)"></span><span>{{ t('chart.ma50') }}</span>
        </span>
        <span class="item" :class="{ off: !visible[2] }" @click="toggleVis(2)">
          <span class="swatch" style="background:var(--ma200)"></span><span>{{ t('chart.ma200') }}</span>
        </span>
      </div>

      <div class="summary" v-if="summaryData" style="display:grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px;">
        <div class="tile" style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;">
          <div class="k" style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .12em;">{{ t('summary.latest_close') }}</div>
          <div class="v" style="font-family: var(--mono); font-size: 18px; margin-top: 4px;">{{ formatNum(summaryData.lastPrice, 2) }}</div>
          <div class="sub" style="color: var(--text-dim); font-size: 11px; margin-top: 2px;">{{ summaryData.lastDate }}</div>
        </div>
        <div class="tile" style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;">
          <div class="k" style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .12em;">{{ t('summary.change') }} ({{ range.toUpperCase() }})</div>
          <div class="v" :style="{ color: summaryData.priceChg >= 0 ? 'var(--score-100)' : 'var(--score-0)' }" style="font-family: var(--mono); font-size: 18px; margin-top: 4px;">
            {{ summaryData.priceChg >= 0 ? '+' : '' }}{{ summaryData.priceChg.toFixed(2) }}%
          </div>
          <div class="sub" style="color: var(--text-dim); font-size: 11px; margin-top: 2px;">vs. {{ summaryData.firstDate }}</div>
        </div>
        <div class="tile" style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;">
          <div class="k" style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .12em;">{{ t('summary.above_ma50') }}</div>
          <div class="v" style="font-family: var(--mono); font-size: 18px; margin-top: 4px;">{{ summaryData.lastMa50.toFixed(1) }}%</div>
          <div class="sub" style="color: var(--text-dim); font-size: 11px; margin-top: 2px;">{{ summaryData.lastMa50 >= 50 ? t('summary.majority_above') : t('summary.majority_below') }}</div>
        </div>
        <div class="tile" style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;">
          <div class="k" style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .12em;">{{ t('summary.above_ma200') }}</div>
          <div class="v" style="font-family: var(--mono); font-size: 18px; margin-top: 4px;">{{ summaryData.lastMa200.toFixed(1) }}%</div>
          <div class="sub" style="color: var(--text-dim); font-size: 11px; margin-top: 2px;">{{ summaryData.lastMa200 >= 50 ? t('summary.lt_bullish') : t('summary.lt_bearish') }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const { t } = useI18n();
const URL = '/breadth.json';
const STAMP_URL = '/breadth.updated_at.txt';
const POLL_MS = 30000;

const range = ref('6m');
const data = ref(null);
const lastUpdated = ref(null);
const visible = ref([true, true, true]);
const chartCanvas = ref(null);
let chart = null;
let timer = null;

const formattedTime = computed(() => {
  if (!lastUpdated.value) return '—';
  try {
    return new Date(lastUpdated.value).toLocaleString(undefined, { 
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false 
    });
  } catch(e) { return lastUpdated.value; }
});

const formatNum = (n, d=2) => Number(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });

const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
};

const filterByRange = (series, r) => {
  if (!series || !series.length) return series;
  const now = new Date();
  let cutoff;
  switch (r) {
    case 'all': return series;
    case '2y': cutoff = new Date(now); cutoff.setFullYear(now.getFullYear() - 2); break;
    case '1y': cutoff = new Date(now); cutoff.setFullYear(now.getFullYear() - 1); break;
    case 'ytd': cutoff = new Date(now.getFullYear(), 0, 1); break;
    case '6m': cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 6); break;
    case '3m': cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 3); break;
    case '1m': cutoff = new Date(now); cutoff.setMonth(now.getMonth() - 1); break;
    default: return series;
  }
  return series.filter(x => new Date(x.date) >= cutoff);
};

const summaryData = computed(() => {
  if (!data.value?.series) return null;
  const slice = filterByRange(data.value.series, range.value);
  if (!slice.length) return null;
  const first = slice[0];
  const last = slice[slice.length - 1];
  const priceChg = (last.price / first.price - 1) * 100;
  return {
    firstDate: first.date,
    lastDate: last.date,
    lastPrice: last.price,
    priceChg,
    lastMa50: last.above_ma50,
    lastMa200: last.above_ma200
  };
});

const buildChart = () => {
  if (chart) return;
  const ctx = chartCanvas.value.getContext('2d');
  const dpr = window.innerWidth <= 720 ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio;
  chart = new window.Chart(ctx, {
    type: 'line',
    data: { datasets: [
      { label: t('chart.sp500_label'), data: [], yAxisID: 'yPrice', borderColor: css('--price'), backgroundColor: css('--price'), borderWidth: 2, pointRadius: 0, tension: 0.1 },
      { label: t('chart.ma50_label'), data: [], yAxisID: 'yPct', borderColor: css('--ma50'), backgroundColor: css('--ma50'), borderWidth: 1.6, pointRadius: 0, tension: 0.1 },
      { label: t('chart.ma200_label'), data: [], yAxisID: 'yPct', borderColor: css('--ma200'), backgroundColor: css('--ma200'), borderWidth: 1.6, pointRadius: 0, tension: 0.1 },
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: false, devicePixelRatio: dpr,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: css('--panel'), borderColor: css('--border'), borderWidth: 1,
          titleColor: css('--text'), bodyColor: css('--text-soft'),
          titleFont: { weight: '600' }, padding: 10,
          callbacks: {
            title: items => items.length ? new Date(items[0].parsed.x).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}) : '',
            label: ctx => {
              const v = ctx.parsed.y;
              if (ctx.dataset.yAxisID === 'yPrice') return `  ${ctx.dataset.label}: ${formatNum(v, 2)}`;
              return `  ${ctx.dataset.label}: ${formatNum(v, 1)}%`;
            },
          },
        },
      },
      scales: {
        x: {
          type: 'time',
          time: { tooltipFormat: 'PP', displayFormats: { day: 'MMM d', month: 'MMM yy', year: 'yyyy' } },
          grid:  { color: 'rgba(128,128,128,0.15)', drawTicks: false },
          ticks: { color: css('--text-dim'), maxRotation: 0, autoSkipPadding: 18 },
          border:{ color: css('--border') },
        },
        yPrice: {
          position: 'left',
          grid:   { color: 'rgba(128,128,128,0.15)', drawTicks: false },
          ticks:  { color: css('--text-dim'), callback: v => v.toLocaleString() },
          border: { color: css('--border') },
        },
        yPct: {
          position: 'right', min: 0, max: 100,
          grid:   { drawOnChartArea: false },
          ticks:  { color: css('--text-dim'), callback: v => v + '%' },
          border: { color: css('--border') },
        },
      },
    },
  });
};

const updateChart = async () => {
  if (!window.Chart) {
    await loadScript('https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js');
    await loadScript('https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js');
  }
  if (!chartCanvas.value) return;
  if (!chart) buildChart();
  if (!data.value?.series) return;
  
  const slice = filterByRange(data.value.series, range.value);
  const toPt = (key) => slice.map(r => ({ x: r.date, y: r[key] }));
  
  chart.data.datasets[0].data = toPt('price');
  chart.data.datasets[1].data = toPt('above_ma50');
  chart.data.datasets[2].data = toPt('above_ma200');
  
  chart.data.datasets.forEach((ds, i) => ds.hidden = !visible.value[i]);
  
  if (slice.length) {
    chart.options.scales.x.min = slice[0].date;
    chart.options.scales.x.max = slice[slice.length - 1].date;
  }
  chart.update('none');
};

const setRange = (r) => {
  range.value = r;
  updateChart();
};

const toggleVis = (index) => {
  visible.value[index] = !visible.value[index];
  updateChart();
};

const fetchBreadth = async () => {
  try {
    const sres = await fetch(STAMP_URL);
    if (!sres.ok) return;
    const stamp = (await sres.text()).trim();
    if (stamp === lastUpdated.value) return;
    
    const jres = await fetch(URL);
    if (!jres.ok) return;
    data.value = await jres.json();
    lastUpdated.value = stamp;
    updateChart();
  } catch (e) {
    console.error('Breadth: failed to fetch', e);
  }
};

onMounted(() => {
  fetchBreadth();
  timer = setInterval(fetchBreadth, POLL_MS);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (chart) chart.destroy();
});
</script>
