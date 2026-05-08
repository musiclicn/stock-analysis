import { ref, computed } from 'vue';

export const useScores = () => {
  const URL = '/scores.json';
  const STAMP_URL = '/scores.updated_at.txt';
  const POLL_MS = 60000;

  const data = useState('scores-data', () => null);
  const lastUpdated = useState('scores-stamp', () => null);

  const tf = ref('daily');
  const idx = ref('ndx');
  const sortKey = ref('weekly');
  const sortDir = ref('desc');
  const query = ref('');
  const page = ref(1);
  const pageSize = ref(50);

  const fetchIfChanged = async (jsonUrl: string, stampUrl: string, lastStamp: string | null) => {
    const sres = await fetch(stampUrl);
    if (!sres.ok) throw new Error(`HTTP ${sres.status} on ${stampUrl}`);
    const stamp = (await sres.text()).trim();
    
    if (stamp && stamp === lastStamp) return { unchanged: true, stamp };
    
    const jres = await fetch(jsonUrl);
    if (!jres.ok) throw new Error(`HTTP ${jres.status} on ${jsonUrl}`);
    const json = await jres.json();
    return { unchanged: false, stamp: stamp || json.updated_at || '', data: json };
  };

  const loadScores = async () => {
    try {
      const res = await fetchIfChanged(URL, STAMP_URL, lastUpdated.value);
      if (!res.unchanged) {
        data.value = res.data;
        lastUpdated.value = res.stamp;
      }
    } catch (e) {
      console.error('Scores: failed to load', e);
    }
  };

  let timer: any;
  const startPolling = () => {
    loadScores();
    if (import.meta.client) {
      timer = setInterval(loadScores, POLL_MS);
    }
  };

  const stopPolling = () => {
    if (timer) clearInterval(timer);
  };

  // Shared utils
  const scoreColor = (s: number) => {
    const _scoreStops = [
      [0,   [239,  68,  68]],  
      [30,  [245, 158,  11]],  
      [50,  [234, 179,   8]],  
      [60,  [132, 204,  22]],  
      [80,  [ 34, 197,  94]],  
      [100, [ 34, 197,  94]],
    ];
    s = Math.max(0, Math.min(100, Number(s) || 0));
    for (let i = 0; i < _scoreStops.length - 1; i++){
      const a = _scoreStops[i][0] as number;
      const ca = _scoreStops[i][1] as number[];
      const b = _scoreStops[i+1][0] as number;
      const cb = _scoreStops[i+1][1] as number[];
      if (s >= a && s <= b){
        const t = (s - a) / (b - a);
        return `rgb(${Math.round(ca[0]+(cb[0]-ca[0])*t)},${Math.round(ca[1]+(cb[1]-ca[1])*t)},${Math.round(ca[2]+(cb[2]-ca[2])*t)})`;
      }
    }
    return '#888';
  };

  const calc2wChg = (r: any) => {
    const hw = r.history_weekly || [];
    const w  = r.weekly ?? 0;
    if (hw.length >= 3) return (w - hw[hw.length - 2]) + (hw[hw.length - 2] - hw[hw.length - 3]);
    return null;
  };

  const calc2dChg = (r: any) => {
    const hd = r.history_daily || [];
    const d  = r.daily ?? 0;
    if (hd.length >= 3) return (d - hd[hd.length - 2]) + (hd[hd.length - 3] - hd[hd.length - 2]);
    return null;
  };

  return {
    data,
    lastUpdated,
    tf,
    idx,
    sortKey,
    sortDir,
    query,
    page,
    pageSize,
    loadScores,
    startPolling,
    stopPolling,
    scoreColor,
    calc2wChg,
    calc2dChg
  };
};
