import { ref, onMounted, onUnmounted } from 'vue';

export const usePrices = () => {
  const BASE = 'https://pub-db1ceca2b3604ce5b2ad16f08710bc8d.r2.dev';
  const URL = `${BASE}/prices.json`;
  const STAMP_URL = `${BASE}/prices.updated_at.txt`;
  const POLL_MS = 5 * 60 * 1000;

  const prices = useState('prices', () => ({}));
  const lastStamp = useState('prices-stamp', () => null);

  const fetchPrices = async () => {
    try {
      const sres = await fetch(STAMP_URL, { cache: 'no-store' });
      if (!sres.ok) return;
      
      const stamp = (await sres.text()).trim();
      if (stamp === lastStamp.value) return;
      
      lastStamp.value = stamp;
      
      const res = await fetch(URL, { cache: 'no-store' });
      if (!res.ok) return;
      
      const json = await res.json();
      prices.value = json.prices;
    } catch (e) {
      console.warn('Prices: failed to load from R2', e);
    }
  };

  let timer;

  const startPolling = () => {
    fetchPrices();
    if (import.meta.client) {
      timer = setInterval(fetchPrices, POLL_MS);
    }
  };

  const stopPolling = () => {
    if (timer) clearInterval(timer);
  };

  return {
    prices,
    lastStamp,
    fetchPrices,
    startPolling,
    stopPolling
  };
};
