<template>
  <section class="view visible">
    <div class="section-head" style="margin-top:0;">
      <h2>{{ t('admin.feedbacks.title') || 'User Feedbacks' }}</h2>
    </div>
    <div style="overflow-x:auto;">
      <div v-if="loading" class="status loading"><span class="dot"></span><span>Loading...</span></div>
      <div v-else-if="error" style="color:#ef4444">{{ error }}</div>
      <table v-else class="stocks" style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="text-align:left; border-bottom: 1px solid var(--border); padding: 0.5rem;">Date</th>
            <th style="text-align:left; border-bottom: 1px solid var(--border); padding: 0.5rem;">User</th>
            <th style="text-align:left; border-bottom: 1px solid var(--border); padding: 0.5rem;">Type</th>
            <th style="text-align:left; border-bottom: 1px solid var(--border); padding: 0.5rem;">Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fb in feedbacks" :key="fb.id">
            <td style="border-bottom:1px solid var(--border); padding:0.5rem; white-space:nowrap;">{{ new Date(fb.created_at).toLocaleString() }}</td>
            <td style="border-bottom:1px solid var(--border); padding:0.5rem;">{{ fb.email || fb.username || 'Anonymous' }}</td>
            <td style="border-bottom:1px solid var(--border); padding:0.5rem;">{{ fb.type }}</td>
            <td style="border-bottom:1px solid var(--border); padding:0.5rem; max-width:400px; word-wrap:break-word;">{{ fb.message }}</td>
          </tr>
          <tr v-if="feedbacks.length === 0">
            <td colspan="4" style="text-align:center; padding: 1rem; color: var(--text-dim);">No feedbacks found.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const feedbacks = ref([]);
const { t } = useI18n();
const loading = ref(true);
const error = ref(null);

onMounted(async () => {
  try {
    const res = await fetch('/api/feedbacks');
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        throw new Error('You must be an admin to view this page.');
      }
      throw new Error(await res.text());
    }
    const data = await res.json();
    feedbacks.value = data.feedbacks || [];
  } catch (err) {
    error.value = err.message || 'Failed to load feedbacks';
  } finally {
    loading.value = false;
  }
});
</script>
