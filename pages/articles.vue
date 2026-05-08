<template>
  <section class="view visible">
    <div id="articles-content">
      <div class="section-head" style="margin-top:0;">
        <h2>Market Commentary &amp; Analysis</h2>
      </div>
      
      <div v-if="loading" class="status loading" style="padding: 2rem; text-align: center;">
        <span class="dot"></span><span>Loading articles...</span>
      </div>

      <div class="article-list" id="articles-list" v-else>
        <article v-for="art in articles" :key="art.id" style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: var(--text); font-size: 20px;">{{ art.title[currentLang] || art.title.en }}</h3>
          <p class="summary" style="font-weight: 500; color: var(--text); margin-top: 8px;">{{ art.summary[currentLang] || art.summary.en }}</p>
          <div class="md-content" v-html="renderMarkdown(art.content[currentLang] || art.content.en)"></div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const { currentLang } = useI18n();
const articles = ref([]);
const loading = ref(true);

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

onMounted(async () => {
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/marked/marked.min.js');
    await loadScript('/articles.js');
    if (window.ARTICLES) {
      articles.value = window.ARTICLES;
    }
  } catch(e) {
    console.error("Failed to load articles", e);
  } finally {
    loading.value = false;
  }
});

const renderMarkdown = (md) => {
  if (!window.marked || !md) return md;
  return window.marked.parse(md);
};
</script>

<style scoped>
.md-content { 
  margin-top: 1.5rem; 
  padding-top: 1.5rem;
  border-top: 1px dashed var(--border);
  color: var(--text-soft); 
  line-height: 1.6; 
  font-size: 14px;
}
.md-content :deep(h2) { margin-top: 1.5rem; margin-bottom: 0.75rem; color: var(--text); font-size: 1.25rem; }
.md-content :deep(h3) { margin-top: 1.25rem; margin-bottom: 0.5rem; color: var(--text); font-size: 1.1rem; }
.md-content :deep(p) { margin-bottom: 1rem; }
.md-content :deep(table) { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 13px; }
.md-content :deep(th), .md-content :deep(td) { border: 1px solid var(--border); padding: 0.5rem; text-align: left; }
.md-content :deep(th) { background: var(--bg); color: var(--text); font-weight: 600; }
.md-content :deep(blockquote) { border-left: 4px solid var(--score-50); padding-left: 1rem; color: var(--text-dim); margin-left: 0; background: rgba(128,128,128,0.05); padding: 10px 15px; border-radius: 0 8px 8px 0; }
.md-content :deep(strong) { color: var(--text); font-weight: 600; }
</style>
