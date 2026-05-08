#!/usr/bin/env python3
"""
build_ai_layers.py — fetch 2 years of daily close prices for the AI 5-Layer
stocks via yfinance and produce ai_layers.json for the dashboard.

Usage:
    pip install yfinance pandas
    python3 build_ai_layers.py

JSON contract:
{
  "updated_at": "YYYY-MM-DD",
  "layers": [
    {
      "name": "AI Energy",
      "tickers": ["CEG", "VST", "NEE", "VRT", "ETN"],
      "series": [{"date": "YYYY-MM-DD", "value": 100.0}, ...]
    },
    ...
  ]
}
Each series is indexed to 100 on the first trading day: the value on any later
date shows cumulative % return of the equal-weight basket relative to that base.
"""

import json
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
import yfinance as yf

LAYERS = [
    {
        "name": "AI Energy",
        "tickers": ["CEG", "VST", "NEE", "VRT", "ETN"],
    },
    {
        "name": "AI Chips & Compute",
        "tickers": ["NVDA", "AMD", "AVGO", "MU", "MRVL", "ARM"],
    },
    {
        "name": "AI Infrastructure",
        "tickers": ["MSFT", "AMZN", "DELL", "HPE", "EQIX"],
    },
    {
        "name": "AI Models",
        "tickers": ["GOOGL", "META", "MSFT", "AMZN"],
    },
    {
        "name": "AI Applications",
        "tickers": ["PLTR", "CRM", "NOW", "CRWD", "TSLA"],
    },
]

END   = date.today()
START = END - timedelta(days=2 * 365 + 30)   # 2 years + small buffer

all_tickers = list({t for layer in LAYERS for t in layer["tickers"]})

print(f"Downloading {len(all_tickers)} tickers  {START} → {END} ...")
raw = yf.download(
    all_tickers,
    start=str(START),
    end=str(END),
    auto_adjust=True,
    progress=False,
    threads=True,
)

# yfinance returns MultiIndex columns when >1 ticker
closes = raw["Close"] if isinstance(raw.columns, pd.MultiIndex) else raw.rename(columns={"Close": all_tickers[0]})[all_tickers]

# Forward-fill weekends/holidays, then drop rows where everything is NaN
closes = closes.ffill().dropna(how="all")

output_layers = []
for layer in LAYERS:
    tickers = [t for t in layer["tickers"] if t in closes.columns]
    if not tickers:
        print(f"  WARNING: no data found for {layer['name']}, skipping")
        continue

    normed = closes[tickers].copy()
    for col in tickers:
        col_series = normed[col].dropna()
        if col_series.empty:
            continue
        base = col_series.iloc[0]
        if base and base != 0:
            normed[col] = normed[col] / base * 100.0

    # Equal-weight average across tickers; skip NaN (handles staggered IPO dates)
    basket = normed.mean(axis=1, skipna=True)

    series = [
        {"date": idx.strftime("%Y-%m-%d"), "value": round(float(v), 2)}
        for idx, v in basket.items()
        if pd.notna(v)
    ]

    output_layers.append({
        "name":    layer["name"],
        "tickers": tickers,
        "series":  series,
    })
    print(f"  {layer['name']:25s}  {len(series)} pts  tickers={tickers}")

today = date.today().isoformat()
out = {
    "updated_at": today,
    "layers":     output_layers,
}

root = Path(__file__).resolve().parent
target = root / "ai_layers.json"
target.write_text(json.dumps(out, separators=(",", ":")))
print(f"\nWrote {target}  ({target.stat().st_size / 1024:.1f} KB)")

stamp = root / "ai_layers.updated_at.txt"
stamp.write_text(today)
print(f"Wrote {stamp}")
