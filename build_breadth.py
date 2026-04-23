#!/usr/bin/env python3
"""
build_breadth.py — generate sample breadth.json for the Market Breadth page.

Produces ~10 years of daily data:
- price:        S&P 500 simulated via random walk with drift
- above_ma50:   % of index constituents trading above their 50-day MA
- above_ma200:  % of index constituents trading above their 200-day MA

Both breadth series are mean-reverting around ~55% and correlate with
short-term price momentum, so the curves look realistic.

JSON contract:
{
  "updated_at": "ISO-8601",
  "series": [
    {"date": "YYYY-MM-DD", "price": float, "above_ma50": float, "above_ma200": float},
    ...
  ]
}
"""

import json
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(7)

START = date(2016, 4, 22)
END   = date(2026, 4, 22)

price    = 2100.0   # approx. SPX close in Apr 2016
drift    = 0.00055  # ~15%/yr annualized
sigma    = 0.0095   # ~15% annualized vol

breadth_50  = 55.0
breadth_200 = 55.0

rows = []
cur = START
while cur <= END:
    if cur.weekday() < 5:  # weekdays only
        # ---- price random walk ----
        r = random.gauss(drift, sigma)
        # occasional drawdown shock
        if random.random() < 0.003:
            r -= random.uniform(0.015, 0.03)
        price *= (1 + r)

        # ---- breadth: reacts to momentum, mean-reverts to ~55 ----
        momentum = r * 2200
        breadth_50  = breadth_50  + momentum        + random.gauss(0, 3) + (55 - breadth_50)  * 0.05
        breadth_200 = breadth_200 + momentum * 0.55 + random.gauss(0, 2) + (55 - breadth_200) * 0.03
        breadth_50  = max(5.0, min(95.0, breadth_50))
        breadth_200 = max(5.0, min(95.0, breadth_200))

        rows.append({
            "date":         cur.isoformat(),
            "price":        round(price, 2),
            "above_ma50":   round(breadth_50,  1),
            "above_ma200":  round(breadth_200, 1),
        })
    cur += timedelta(days=1)

out = {
    "updated_at": date.today().isoformat(),
    "series":     rows,
}
target = Path(__file__).resolve().parent / "breadth.json"
target.write_text(json.dumps(out))
print(f"Wrote {target}  ({len(rows)} rows, {target.stat().st_size/1024:.1f} KB)")
