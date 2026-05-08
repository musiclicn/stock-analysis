<template>
  <div class="container">
    <!-- ================= TOPBAR ================= -->
  <header class="topbar">
    <div class="brand">
      <div>
        <h1><span class="accent">Alpha</span> Stock</h1>
        <small>{{ t('brand.tagline') }}</small>
      </div>
    </div>
    <div class="toolbar">
      <div id="status" class="status loading"><span class="dot"></span><span id="status-text">Loading…</span></div>
      <button id="refresh" class="btn" title="Reload this tab's data" style="display: none;">
        <span id="refresh-ico">↻</span><span data-i18n="btn.refresh">Refresh</span>
      </button>
      <button id="theme-toggle" class="btn" title="Toggle theme" @click="toggleTheme">{{ isLight ? '🌙' : '☀️' }}</button>
      <button id="lang-toggle" class="btn" @click="toggleLang">{{ t('lang.toggle') }}</button>
      <button id="feedback-toggle" class="btn" data-i18n="btn.feedback">Feedback</button>
      <div id="user-welcome" class="user-welcome" style="display:none;"></div>
      <button id="login-toggle" class="btn">Login</button>
    </div>
  </header>



  <!-- ================= TAB NAV ================= -->
    
  <nav class="tab-nav">
    <NuxtLink to="/" class="tab" active-class="active"><span>{{ t('tab.overview') }}</span><span class="pill">scores</span></NuxtLink>
    <NuxtLink to="/breadth" class="tab" active-class="active"><span>{{ t('tab.breadth') }}</span><span class="pill">S&amp;P 500</span></NuxtLink>
    <NuxtLink to="/ai-layers" class="tab" active-class="active"><span>{{ t('tab.ai-layers') }}</span><span class="pill">AI</span></NuxtLink>
    <NuxtLink to="/articles" class="tab" active-class="active"><span>{{ t('tab.articles') }}</span><span class="pill" id="articles-pill">1</span></NuxtLink>
    <NuxtLink to="/admin" class="tab" active-class="active" id="admin-tab" style="display:none;"><span>{{ t('tab.admin') }}</span></NuxtLink>
  </nav>

  

    <!-- Nuxt Page Content will be injected here -->
    <slot />

    <footer class="foot">
      Alpha Stock &copy; 2024. Data updates every 5 minutes.
    </footer>

    
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const isLight = ref(false);
const { t, toggleLang, initI18n } = useI18n();

const toggleTheme = () => {
  isLight.value = !isLight.value;
  if (isLight.value) {
    document.documentElement.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
  } else {
    document.documentElement.classList.remove('light-theme');
    localStorage.setItem('theme', 'dark');
  }
};

onMounted(() => {
  initI18n();
  const saved = localStorage.getItem('theme');
  if (saved === 'light') {
    isLight.value = true;
    document.documentElement.classList.add('light-theme');
  }
});
</script>
