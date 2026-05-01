/**
 * translations.js — all UI strings for Market Pulse dashboard
 * Add/edit Chinese or English text here; the site picks up changes on reload.
 *
 * Keys are grouped by feature area. Each key must exist in BOTH 'en' and 'zh'.
 */

var TRANSLATIONS = {
  en: {
    /* ---------- brand ---------- */
    'brand.title':   'Alpha Stock',
    'brand.tagline': 'U.S. equities · scores & breadth',

    /* ---------- status bar ---------- */
    'status.loading':    'Loading…',
    'status.refreshing': 'Refreshing…',
    'status.live':       'Live',
    'status.failed':     'Failed to load',

    /* ---------- toolbar ---------- */
    'btn.refresh': 'Refresh',
    'lang.toggle': '中文',          // label shown when current lang is EN → click to go ZH

    /* ---------- tab navigation ---------- */
    'tab.overview':  'Overview',
    'tab.breadth':   'Market Breadth',
    'tab.articles':  'Commentary',

    /* ---------- section headings ---------- */
    'section.indexes':      'Major Indexes',
    'section.sectors':      'Sectors (SPDR ETFs)',
    'section.constituents': 'Constituents',

    /* ---------- hints / labels ---------- */
    'hint.score':    'Score: 0–30 strong bearish · 31–49 bearish · 50–59 neutral · 60–79 bullish · 80–100 strong bullish',
    'hint.sectors':  'Sorted by active timeframe · click a sector for drill-down (prototype)',
    'hint.sorted_by': 'Sorted by',

    /* ---------- timeframe toggle ---------- */
    'tf.daily':  'Daily',
    'tf.weekly': 'Weekly',

    /* ---------- score legend ---------- */
    'legend.strong_bearish': '0–30 strong bearish',
    'legend.bearish':        '31–49 bearish',
    'legend.neutral':        '50–59 neutral',
    'legend.bullish':        '60–79 bullish',
    'legend.strong_bullish': '80–100 strong bullish',

    /* ---------- index/constituent tabs ---------- */
    'idx.ndx': 'Nasdaq 100',
    'idx.spx': 'S&P 500',
    'idx.hot100': 'Hot 100',

    /* ---------- search ---------- */
    'search.placeholder': 'Search ticker or name…',

    /* ---------- score decision matrix ---------- */
    'matrix.title':     'Score Decision Matrix',
    'matrix.hint':      'How to interpret weekly × daily score combinations',
    'matrix.col.weekly': 'Weekly',
    'matrix.col.daily':  'Daily',
    'matrix.col.signal': 'Signal',
    'matrix.col.action': 'Action',
    'matrix.any':        'Any',
    'matrix.s1.signal':  'Strong Trend Confluence',
    'matrix.s1.action':  'Strong Buy',
    'matrix.s2.signal':  'Bull Market Pullback',
    'matrix.s2.action':  'Buy the Dip',
    'matrix.s3.signal':  'Extreme Fear Entry',
    'matrix.s3.action':  'Bottom Fish (small size)',
    'matrix.s4.signal':  'Range Breakout',
    'matrix.s4.action':  'Weak Buy (quick)',
    'matrix.s5.signal':  'Trendless Chop',
    'matrix.s5.action':  'Neutral (watch)',
    'matrix.s6.signal':  'Bear / Downtrend',
    'matrix.s6.action':  'Avoid / Short',

    /* ---------- table headers ---------- */
    'th.rank':   '#',
    'th.ticker': 'Ticker',
    'th.name':   'Name',
    'th.sector': 'Sector',
    'th.cap':    'Cap',
    'th.volume': 'Volume',
    'th.volRatio': 'Vol Ratio',
    'th.score':  'Score',
    'th.price':  'Price',
    'th.chg':    'Chg %',

    /* ---------- trend labels (score bands) ---------- */
    'trend.strong_bullish': 'Strong Bullish',
    'trend.bullish':        'Bullish',
    'trend.neutral':        'Neutral',
    'trend.bearish':        'Bearish',
    'trend.strong_bearish': 'Strong Bearish',

    /* ---------- index / sector cards ---------- */
    'card.daily_score':  'Daily Score',
    'card.weekly_score': 'Weekly Score',
    'card.price':  'Price',
    'card.trend':  'Trend',
    'card.daily':  'Daily',
    'card.weekly': 'Weekly',
    'card.volume': 'Volume',
    'card.vol_ratio': 'Vol Ratio',

    /* ---------- breadth tab ---------- */
    'breadth.title':    'S&P 500 Market Breadth',
    'breadth.subtitle': 'Index price vs. % of constituents above their 50-day and 200-day moving averages',
    'breadth.zoom':     'Zoom',
    'breadth.updated':  'Updated',

    /* ---------- chart legend (HTML items) ---------- */
    'chart.sp500':  'S&P 500 (Index, left)',
    'chart.ma50':   '% above MA50 (right)',
    'chart.ma200':  '% above MA200 (right)',

    /* ---------- chart dataset labels (tooltip) ---------- */
    'chart.sp500_label': 'S&P 500',
    'chart.ma50_label':  '% above MA50',
    'chart.ma200_label': '% above MA200',

    /* ---------- chart axis titles ---------- */
    'chart.y_index':   'Index',
    'chart.y_percent': 'Percent',

    /* ---------- summary tiles ---------- */
    'summary.latest_close':   'Latest Close',
    'summary.change':         'Change',
    'summary.above_ma50':     '% above MA50',
    'summary.above_ma200':    '% above MA200',
    'summary.majority_above': 'majority above',
    'summary.majority_below': 'majority below',
    'summary.lt_bullish':     'long-term bullish',
    'summary.lt_bearish':     'long-term bearish',

    /* ---------- error banner (innerHTML — <code> tags preserved) ---------- */
    'error.title': 'Data load failed.',
    'error.hint':  'Serve this folder over HTTP (e.g. <code>python3 -m http.server 8000</code>) — browsers block <code>fetch()</code> on <code>file://</code>.',

    /* ---------- footer (innerHTML) ---------- */
    'footer.text': 'Data from <code>scores.json</code> and <code>breadth.json</code>. Edits appear within seconds.',

    /* ---------- articles ---------- */
    'articles.expand':   '▼ Read full article',
    'articles.collapse': '▲ Collapse',

    /* ---------- score intro ---------- */
    'score-intro.label': 'AlphaStockPro Score',
    'score-intro.body':  'A <strong>proprietary quantitative metric</strong> that tracks the underlying momentum and strength of US indexes, sectors, and stocks. By analyzing historical score changes, we help you identify <strong>trend exhaustion</strong> and pinpoint <strong>high-probability reversal opportunities</strong>.',

    /* ---------- page titles ---------- */
    'title.overview':  'Alpha Stock — U.S. Equities Dashboard',
    'title.breadth':   'Market Breadth — Alpha Stock',
    'title.articles':  'Commentary — Alpha Stock',
  },

  zh: {
    /* ---------- 品牌 ---------- */
    'brand.title':   '市场脉搏',
    'brand.tagline': '美股 · 评分与宽度',

    /* ---------- 状态栏 ---------- */
    'status.loading':    '加载中…',
    'status.refreshing': '刷新中…',
    'status.live':       '实时',
    'status.failed':     '加载失败',

    /* ---------- 工具栏 ---------- */
    'btn.refresh': '刷新',
    'lang.toggle': 'English',      // 当前语言为中文时显示，点击切换为英文

    /* ---------- 标签导航 ---------- */
    'tab.overview':  '总览',
    'tab.breadth':   '市场宽度',
    'tab.articles':  '市场评论',

    /* ---------- 区块标题 ---------- */
    'section.indexes':      '主要指数',
    'section.sectors':      '板块（SPDR ETF）',
    'section.constituents': '成分股',

    /* ---------- 提示 / 标签 ---------- */
    'hint.score':    '评分：0（强烈看空）· 50（中性）· 100（强烈看多）',
    'hint.sectors':  '按当前周期排序 · 点击板块查看详情（原型）',
    'hint.sorted_by': '排序依据',

    /* ---------- 时间周期 ---------- */
    'tf.daily':  '日线',
    'tf.weekly': '周线',

    /* ---------- 评分图例 ---------- */
    'legend.strong_bearish': '0–30 强烈看空',
    'legend.bearish':        '31–49 看空',
    'legend.neutral':        '50–59 中性',
    'legend.bullish':        '60–79 看多',
    'legend.strong_bullish': '80–100 强烈看多',

    /* ---------- 指数 / 成分股标签 ---------- */
    'idx.ndx': '纳斯达克100',
    'idx.spx': '标普500',
    'idx.hot100': '热门100',

    /* ---------- 搜索 ---------- */
    'search.placeholder': '搜索代码或名称…',

    /* ---------- 决策矩阵 ---------- */
    'matrix.title':      '决策矩阵',
    'matrix.hint':       '周线与日线评分组合解读指南',
    'matrix.col.weekly': '周线强度',
    'matrix.col.daily':  '日线强度',
    'matrix.col.signal': '决策定性',
    'matrix.col.action': '策略动作',
    'matrix.any':        '任意',
    'matrix.s1.signal':  '主升浪强共振',
    'matrix.s1.action':  '强力做多',
    'matrix.s2.signal':  '牛市回调',
    'matrix.s2.action':  '左侧低吸',
    'matrix.s3.signal':  '极度恐慌买点',
    'matrix.s3.action':  '小仓位试多',
    'matrix.s4.signal':  '震荡市突破',
    'matrix.s4.action':  '快进快出',
    'matrix.s5.signal':  '无趋势震荡',
    'matrix.s5.action':  '观望/不做',
    'matrix.s6.signal':  '熊市/空头排列',
    'matrix.s6.action':  '规避/做空候选',

    /* ---------- 表头 ---------- */
    'th.rank':   '#',
    'th.ticker': '代码',
    'th.name':   '名称',
    'th.sector': '板块',
    'th.cap':    '市值级别',
    'th.volume': '成交量',
    'th.volRatio': '量比',
    'th.score':  '评分',
    'th.price':  '价格',
    'th.chg':    '涨跌%',

    /* ---------- 趋势标签（评分段） ---------- */
    'trend.strong_bullish': '强烈看多',
    'trend.bullish':        '看多',
    'trend.neutral':        '中性',
    'trend.bearish':        '看空',
    'trend.strong_bearish': '强烈看空',

    /* ---------- 指数 / 板块卡片 ---------- */
    'card.daily_score':  '日线评分',
    'card.weekly_score': '周线评分',
    'card.price':  '价格',
    'card.trend':  '趋势',
    'card.daily':  '日线',
    'card.weekly': '周线',
    'card.volume': '成交量',
    'card.vol_ratio': '量比',

    /* ---------- 市场宽度标签页 ---------- */
    'breadth.title':    '标普500市场宽度',
    'breadth.subtitle': '指数价格 vs. 成分股中高于50日/200日均线的比例',
    'breadth.zoom':     '缩放',
    'breadth.updated':  '更新时间',

    /* ---------- 图表图例（HTML 元素） ---------- */
    'chart.sp500':  '标普500（指数，左轴）',
    'chart.ma50':   '高于MA50的比例（右轴）',
    'chart.ma200':  '高于MA200的比例（右轴）',

    /* ---------- 图表数据集标签（悬浮提示） ---------- */
    'chart.sp500_label': '标普500',
    'chart.ma50_label':  '高于MA50的比例',
    'chart.ma200_label': '高于MA200的比例',

    /* ---------- 图表坐标轴标题 ---------- */
    'chart.y_index':   '指数',
    'chart.y_percent': '百分比',

    /* ---------- 汇总磁贴 ---------- */
    'summary.latest_close':   '最新收盘',
    'summary.change':         '区间涨跌',
    'summary.above_ma50':     '高于MA50比例',
    'summary.above_ma200':    '高于MA200比例',
    'summary.majority_above': '多数高于均线',
    'summary.majority_below': '多数低于均线',
    'summary.lt_bullish':     '长期看多',
    'summary.lt_bearish':     '长期看空',

    /* ---------- 错误横幅（innerHTML — 保留 <code> 标签） ---------- */
    'error.title': '数据加载失败。',
    'error.hint':  '请通过HTTP服务访问（如 <code>python3 -m http.server 8000</code>）——浏览器禁止在 <code>file://</code> 下使用 <code>fetch()</code>。',

    /* ---------- 页脚（innerHTML） ---------- */
    'footer.text': '数据来自 <code>scores.json</code> 和 <code>breadth.json</code>。修改后数秒内生效。',

    /* ---------- 文章 ---------- */
    'articles.expand':   '▼ 展开全文',
    'articles.collapse': '▲ 收起',

    /* ---------- 评分简介 ---------- */
    'score-intro.label': 'AlphaStockPro 评分',
    'score-intro.body':  '一项<strong>专有量化指标</strong>，追踪美国指数、板块与个股的底层动量和强度。通过分析历史评分变化，帮助您识别<strong>趋势衰竭</strong>信号，精准捕捉<strong>高概率反转机会</strong>。',

    /* ---------- 页面标题 ---------- */
    'title.overview':  '市场脉搏 — 美股仪表板',
    'title.breadth':   '市场宽度 — 市场脉搏',
    'title.articles':  '市场评论 — 市场脉搏',
  },
};

/* ── runtime ── */

var currentLang = localStorage.getItem('mp-lang') || 'en';

/** Look up a translation key; returns null if not found in any locale. */
function t(key) {
  return (TRANSLATIONS[currentLang] || {})[key]
      || (TRANSLATIONS.en || {})[key]
      || null;
}

/**
 * Walk all [data-i18n] elements and update their text (or attribute).
 * [data-i18n-html] elements get innerHTML instead of textContent.
 * [data-i18n-attr] elements set the named attribute (e.g. placeholder).
 * Skips update when key is missing so hardcoded HTML fallback stays visible.
 */
function applyI18n() {
  document.documentElement.lang = currentLang;

  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key  = el.dataset.i18n;
    var val  = t(key);
    if (val === null) return;
    var attr = el.dataset.i18nAttr;
    if (attr) {
      el.setAttribute(attr, val);
    } else {
      el.textContent = val;
    }
  });

  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    var val = t(el.dataset.i18nHtml);
    if (val !== null) el.innerHTML = val;
  });

  var langBtn = document.getElementById('lang-toggle');
  var langVal = t('lang.toggle');
  if (langBtn && langVal !== null) langBtn.textContent = langVal;
}

/** Switch language, persist to localStorage, and refresh all static labels. */
function switchLang(lang) {
  currentLang = lang;
  localStorage.setItem('mp-lang', lang);
  applyI18n();
}
