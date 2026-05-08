<template>
  <section class="view visible">
    <div class="chart-card">
      <div class="chart-head">
        <h2>{{ t('ailayers.title') }}</h2>
        <div class="sub">{{ t('ailayers.subtitle') }}</div>
      </div>

      <div class="range-row">
        <span class="label">{{ t('ailayers.zoom') }}</span>
        <div class="range">
          <button v-for="r in ['2y', '1y', 'ytd', '6m', '3m', '1m']" :key="r" 
                  :class="{ active: range === r }" @click="setRange(r)">
            {{ r.toUpperCase() }}
          </button>
        </div>
        <div class="spacer"></div>
        <span class="label">{{ t('ailayers.updated') }}</span>
        <span style="font-family: var(--mono); color: var(--text-soft); font-size: 12px;">{{ formattedTime }}</span>
      </div>

      <div class="chart-wrap"><canvas ref="chartCanvas"></canvas></div>

      <div class="legend-row">
        <span class="item" :class="{ off: !visible[0] }" @click="toggleVis(0)">
          <span class="swatch" style="background:var(--layer0)"></span><span>{{ t('ailayers.layer0') }}</span>
        </span>
        <span class="item" :class="{ off: !visible[1] }" @click="toggleVis(1)">
          <span class="swatch" style="background:var(--layer1)"></span><span>{{ t('ailayers.layer1') }}</span>
        </span>
        <span class="item" :class="{ off: !visible[2] }" @click="toggleVis(2)">
          <span class="swatch" style="background:var(--layer2)"></span><span>{{ t('ailayers.layer2') }}</span>
        </span>
        <span class="item" :class="{ off: !visible[3] }" @click="toggleVis(3)">
          <span class="swatch" style="background:var(--layer3)"></span><span>{{ t('ailayers.layer3') }}</span>
        </span>
        <span class="item" :class="{ off: !visible[4] }" @click="toggleVis(4)">
          <span class="swatch" style="background:var(--layer4)"></span><span>{{ t('ailayers.layer4') }}</span>
        </span>
      </div>

      <div class="summary" v-if="summaryData" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 18px;">
        <div v-for="(tile, i) in summaryData" :key="i" class="tile" style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 12px 14px;" :style="{ opacity: tile.visible ? 1 : 0.35 }">
          <div class="k" style="color: var(--text-dim); font-size: 11px; text-transform: uppercase; letter-spacing: .12em;">{{ tile.name }}</div>
          <div class="v" :style="{ color: tile.priceChg >= 0 ? 'var(--score-100)' : 'var(--score-0)' }" style="font-family: var(--mono); font-size: 18px; margin-top: 4px;">
            {{ tile.priceChg >= 0 ? '+' : '' }}{{ tile.priceChg.toFixed(2) }}%
          </div>
          <div class="sub" style="color: var(--text-dim); font-size: 11px; margin-top: 2px;">vs. {{ tile.firstDate }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';

const { t } = useI18n();
const URL = '/ai_layers.json';
const STAMP_URL = '/ai_layers.updated_at.txt';
const POLL_MS = 60000;

const range = ref('2y');
const data = ref(null);
const lastUpdated = ref(null);
const visible = ref([true, true, true, true, true]);
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
  if (!series || !series.length) return series || [];
  const last = new Date(series[series.length - 1].date);
  let cutoff;
  switch (r) {
    case '2y': cutoff = new Date(last); cutoff.setFullYear(last.getFullYear() - 2); break;
    case '1y': cutoff = new Date(last); cutoff.setFullYear(last.getFullYear() - 1); break;
    case 'ytd': cutoff = new Date(last.getFullYear(), 0, 1); break;
    case '6m': cutoff = new Date(last); cutoff.setMonth(last.getMonth() - 6); break;
    case '3m': cutoff = new Date(last); cutoff.setMonth(last.getMonth() - 3); break;
    case '1m': cutoff = new Date(last); cutoff.setMonth(last.getMonth() - 1); break;
    default: return series;
  }
  return series.filter(x => new Date(x.date) >= cutoff);
};

const rebase = (slice) => {
  if (!slice.length) return slice;
  const base = slice[0].value;
  if (!base) return slice;
  return slice.map(r => ({ x: r.date, y: Math.round((r.value / base * 100) * 100) / 100 }));
};

const summaryData = computed(() => {
  if (!data.value?.layers) return null;
  return data.value.layers.map((layer, i) => {
    const slice = filterByRange(layer.series, range.value);
    if (!slice.length) return null;
    const first = slice[0];
    const last = slice[slice.length - 1];
    const priceChg = (last.value / first.value - 1) * 100;
    return {
      name: [t('ailayers.layer0'), t('ailayers.layer1'), t('ailayers.layer2'), t('ailayers.layer3'), t('ailayers.layer4')][i] || layer.name,
      priceChg,
      lastValue: last.value,
      firstDate: first.date,
      lastDate: last.date,
      visible: visible.value[i]
    };
  }).filter(Boolean);
});

const buildChart = () => {
  if (chart) return;
  const ctx = chartCanvas.value.getContext('2d');
  const dpr = window.innerWidth <= 720 ? Math.min(window.devicePixelRatio, 2) : window.devicePixelRatio;
  
  const layerVars = ['--layer0','--layer1','--layer2','--layer3','--layer4'];
  const layerNames = [t('ailayers.layer0'), t('ailayers.layer1'), t('ailayers.layer2'), t('ailayers.layer3'), t('ailayers.layer4')];
  
  const datasets = layerVars.map((v, i) => ({
    label: layerNames[i],
    data: [],
    borderColor: css(v),
    backgroundColor: css(v),
    borderWidth: 2,
    pointRadius: 0,
    tension: 0.1,
  }));

  chart = new window.Chart(ctx, {
    type: 'line',
    data: { datasets },
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
            label: ctx => `  ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}`,
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
        y: {
          position: 'left',
          grid:   { color: 'rgba(128,128,128,0.15)', drawTicks: false },
          ticks:  { color: css('--text-dim'), callback: v => v.toFixed(0) },
          border: { color: css('--border') },
          title:  { display: true, text: t('ailayers.indexed'), color: css('--text-dim'), font: { size: 11 } },
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
  if (!data.value?.layers) return;
  
  let xMin, xMax;
  data.value.layers.forEach((layer, i) => {
    const slice = filterByRange(layer.series, range.value);
    const pts = rebase(slice);
    chart.data.datasets[i].data = pts;
    chart.data.datasets[i].hidden = !visible.value[i];
    
    if (pts.length) {
      if (!xMin || pts[0].x < xMin) xMin = pts[0].x;
      if (!xMax || pts[pts.length-1].x > xMax) xMax = pts[pts.length-1].x;
    }
  });
  
  if (xMin && xMax) {
    chart.options.scales.x.min = xMin;
    chart.options.scales.x.max = xMax;
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

const fetchAILayers = async () => {
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
    console.error('AI Layers: failed to fetch', e);
  }
};

onMounted(() => {
  fetchAILayers();
  timer = setInterval(fetchAILayers, POLL_MS);
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
  if (chart) chart.destroy();
});
</script>
