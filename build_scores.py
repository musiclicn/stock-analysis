#!/usr/bin/env python3
"""
build_scores.py — (re)generate scores.json for the Market Pulse prototype.

Run this once to seed scores.json. Thereafter, edit scores.json by hand or
overwrite it from your real scoring pipeline. The web UI polls the file and
re-renders when `updated_at` changes.

JSON contract:
{
  "updated_at": "ISO-8601 string",
  "indexes": [ {sym, name, price, chg, daily, weekly}, ... ],
  "sectors": [ {sym, name, price, chg, daily, weekly}, ... ],
  "stocks": {
    "ndx": [ {sym, name, sector, price, chg, daily, weekly}, ... ],  # 100 rows
    "spx": [ {sym, name, sector, price, chg, daily, weekly}, ... ]   # 500 rows
  }
}
All score fields are integers 0-100. Prices are floats. chg is percent float.
"""

import json
import random
import string
from datetime import datetime, timezone
from pathlib import Path

SEED = 20260422
rng = random.Random(SEED)


def rand_score(bias=50, spread=25):
    """Bounded gaussian-ish integer 1..99."""
    s = sum(rng.random() for _ in range(4)) / 4          # ~N(0.5, ...)
    s = (s - 0.5) * 2 * spread + bias
    return max(1, min(99, int(round(s))))


# ---------------------------------------------------------------- Indexes
INDEXES = [
    {"sym": "SPX", "name": "S&P 500",    "price": 5321.42,  "chg":  0.64},
    {"sym": "NDX", "name": "Nasdaq 100", "price": 18742.11, "chg":  0.92},
]
for ix in INDEXES:
    ix["daily"]  = rand_score(62, 15)
    ix["weekly"] = rand_score(58, 18)


# ---------------------------------------------------------------- Sectors
SECTORS = [
    ("XLC",  "Communication Svcs"),
    ("XLY",  "Consumer Discretionary"),
    ("XLP",  "Consumer Staples"),
    ("XLE",  "Energy"),
    ("XLF",  "Financials"),
    ("XLV",  "Health Care"),
    ("XLI",  "Industrials"),
    ("XLK",  "Technology"),
    ("XLB",  "Materials"),
    ("XLRE", "Real Estate"),
    ("XLU",  "Utilities"),
]
sector_rows = []
for sym, name in SECTORS:
    sector_rows.append({
        "sym":    sym,
        "name":   name,
        "price":  round(30 + rng.random() * 200, 2),
        "chg":    round(rng.uniform(-1.3, 1.7), 2),
        "daily":  rand_score(55, 22),
        "weekly": rand_score(52, 20),
    })


# ---------------------------------------------------------------- Stocks
NDX_SEED = [
    ("AAPL","Apple","XLK"),("MSFT","Microsoft","XLK"),("NVDA","NVIDIA","XLK"),("AMZN","Amazon.com","XLY"),
    ("GOOGL","Alphabet A","XLC"),("GOOG","Alphabet C","XLC"),("META","Meta Platforms","XLC"),("TSLA","Tesla","XLY"),
    ("AVGO","Broadcom","XLK"),("COST","Costco","XLP"),("NFLX","Netflix","XLC"),("AMD","Adv. Micro Devices","XLK"),
    ("PEP","PepsiCo","XLP"),("ADBE","Adobe","XLK"),("CSCO","Cisco","XLK"),("TMUS","T-Mobile US","XLC"),
    ("LIN","Linde","XLB"),("INTC","Intel","XLK"),("CMCSA","Comcast","XLC"),("QCOM","Qualcomm","XLK"),
    ("AMGN","Amgen","XLV"),("TXN","Texas Instruments","XLK"),("INTU","Intuit","XLK"),("AMAT","Applied Materials","XLK"),
    ("HON","Honeywell","XLI"),("ISRG","Intuitive Surgical","XLV"),("SBUX","Starbucks","XLY"),("BKNG","Booking","XLY"),
    ("VRTX","Vertex Pharm","XLV"),("GILD","Gilead","XLV"),("ADI","Analog Devices","XLK"),("MDLZ","Mondelez","XLP"),
    ("ADP","ADP","XLI"),("REGN","Regeneron","XLV"),("LRCX","Lam Research","XLK"),("PYPL","PayPal","XLF"),
    ("PANW","Palo Alto Networks","XLK"),("MU","Micron","XLK"),("MELI","MercadoLibre","XLY"),("KLAC","KLA","XLK"),
    ("SNPS","Synopsys","XLK"),("CDNS","Cadence Design","XLK"),("ASML","ASML","XLK"),("CRWD","CrowdStrike","XLK"),
    ("MAR","Marriott","XLY"),("CTAS","Cintas","XLI"),("ORLY","O'Reilly Auto","XLY"),("FTNT","Fortinet","XLK"),
    ("MNST","Monster Beverage","XLP"),("DASH","DoorDash","XLY"),("CHTR","Charter Comm","XLC"),("PAYX","Paychex","XLI"),
    ("ABNB","Airbnb","XLY"),("NXPI","NXP Semi","XLK"),("ADSK","Autodesk","XLK"),("MRVL","Marvell","XLK"),
    ("PCAR","PACCAR","XLI"),("WDAY","Workday","XLK"),("CPRT","Copart","XLI"),("AZN","AstraZeneca","XLV"),
    ("ROP","Roper Tech","XLI"),("AEP","Amer. Electric Power","XLU"),("KDP","Keurig Dr Pepper","XLP"),("ODFL","Old Dominion","XLI"),
    ("FANG","Diamondback Energy","XLE"),("IDXX","IDEXX Labs","XLV"),("EXC","Exelon","XLU"),("CSX","CSX","XLI"),
    ("FAST","Fastenal","XLI"),("TTD","Trade Desk","XLK"),("DDOG","Datadog","XLK"),("XEL","Xcel Energy","XLU"),
    ("ON","ON Semi","XLK"),("BKR","Baker Hughes","XLE"),("CTSH","Cognizant","XLK"),("BIIB","Biogen","XLV"),
    ("CCEP","Coca-Cola Europacific","XLP"),("TEAM","Atlassian","XLK"),("GEHC","GE HealthCare","XLV"),("DXCM","DexCom","XLV"),
    ("LULU","Lululemon","XLY"),("ZS","Zscaler","XLK"),("ROST","Ross Stores","XLY"),("TTWO","Take-Two","XLC"),
    ("CDW","CDW Corp","XLK"),("ANSS","Ansys","XLK"),("VRSK","Verisk","XLI"),("WBD","Warner Bros Discovery","XLC"),
    ("MCHP","Microchip","XLK"),("WBA","Walgreens","XLP"),("SIRI","SiriusXM","XLC"),("GFS","GlobalFoundries","XLK"),
    ("ILMN","Illumina","XLV"),("CEG","Constellation Energy","XLU"),("LCID","Lucid","XLY"),("SMCI","Super Micro","XLK"),
    ("ARM","Arm Holdings","XLK"),("TSCO","Tractor Supply","XLY"),("WYNN","Wynn Resorts","XLY"),("EA","Electronic Arts","XLC"),
    ("VRSN","VeriSign","XLK"),("ZM","Zoom","XLK"),("ALGN","Align Tech","XLV"),("ENPH","Enphase","XLK"),
]

SPX_EXTRA = [
    ("JPM","JPMorgan Chase","XLF"),("BAC","Bank of America","XLF"),("WFC","Wells Fargo","XLF"),("GS","Goldman Sachs","XLF"),
    ("MS","Morgan Stanley","XLF"),("C","Citigroup","XLF"),("BLK","BlackRock","XLF"),("SCHW","Charles Schwab","XLF"),
    ("AXP","American Express","XLF"),("V","Visa","XLF"),("MA","Mastercard","XLF"),("COF","Capital One","XLF"),
    ("SPGI","S&P Global","XLF"),("CB","Chubb","XLF"),("PGR","Progressive","XLF"),("AIG","AIG","XLF"),
    ("JNJ","Johnson & Johnson","XLV"),("UNH","UnitedHealth","XLV"),("LLY","Eli Lilly","XLV"),("PFE","Pfizer","XLV"),
    ("MRK","Merck","XLV"),("ABBV","AbbVie","XLV"),("TMO","Thermo Fisher","XLV"),("DHR","Danaher","XLV"),
    ("BMY","Bristol-Myers","XLV"),("CI","Cigna","XLV"),("HUM","Humana","XLV"),("CVS","CVS Health","XLV"),
    ("XOM","Exxon Mobil","XLE"),("CVX","Chevron","XLE"),("COP","ConocoPhillips","XLE"),("SLB","Schlumberger","XLE"),
    ("EOG","EOG Resources","XLE"),("PSX","Phillips 66","XLE"),("MPC","Marathon Petroleum","XLE"),("OXY","Occidental","XLE"),
    ("WMT","Walmart","XLP"),("PG","Procter & Gamble","XLP"),("KO","Coca-Cola","XLP"),
    ("PM","Philip Morris","XLP"),("MO","Altria","XLP"),("CL","Colgate-Palmolive","XLP"),("TGT","Target","XLP"),
    ("HD","Home Depot","XLY"),("LOW","Lowe's","XLY"),("NKE","Nike","XLY"),("MCD","McDonald's","XLY"),
    ("DIS","Walt Disney","XLC"),("VZ","Verizon","XLC"),("T","AT&T","XLC"),
    ("BA","Boeing","XLI"),("CAT","Caterpillar","XLI"),("DE","Deere","XLI"),("GE","GE Aerospace","XLI"),
    ("LMT","Lockheed Martin","XLI"),("RTX","RTX","XLI"),("UPS","UPS","XLI"),("FDX","FedEx","XLI"),
    ("UNP","Union Pacific","XLI"),("NSC","Norfolk Southern","XLI"),("ETN","Eaton","XLI"),("EMR","Emerson","XLI"),
    ("APD","Air Products","XLB"),("SHW","Sherwin-Williams","XLB"),("ECL","Ecolab","XLB"),("DD","DuPont","XLB"),
    ("FCX","Freeport-McMoRan","XLB"),("NUE","Nucor","XLB"),("VMC","Vulcan Materials","XLB"),("MLM","Martin Marietta","XLB"),
    ("PLD","Prologis","XLRE"),("AMT","American Tower","XLRE"),("EQIX","Equinix","XLRE"),("CCI","Crown Castle","XLRE"),
    ("PSA","Public Storage","XLRE"),("WELL","Welltower","XLRE"),("SPG","Simon Property","XLRE"),("O","Realty Income","XLRE"),
    ("NEE","NextEra Energy","XLU"),("DUK","Duke Energy","XLU"),("SO","Southern Co","XLU"),("D","Dominion","XLU"),
    ("SRE","Sempra","XLU"),("PCG","PG&E","XLU"),("ED","Consolidated Edison","XLU"),
]

NAME_POOL = ["Capital","Partners","Holdings","Industries","Resources","Networks","Technologies",
             "Logistics","Materials","Pharma","Biosciences","Solutions","Dynamics","Systems","Group"]
SECTOR_POOL = ["XLK","XLF","XLV","XLY","XLI","XLP","XLE","XLC","XLB","XLRE","XLU"]


def pad_to(lst, count):
    seen = {s[0] for s in lst}
    while len(lst) < count:
        n = rng.randint(3, 4)
        sym = "".join(rng.choice(string.ascii_uppercase) for _ in range(n))
        if sym in seen: continue
        seen.add(sym)
        tag  = sym.title() + " " + rng.choice(NAME_POOL)
        sect = rng.choice(SECTOR_POOL)
        lst.append((sym, tag, sect))
    return lst


def make_stock_row(sym, name, sector, bias):
    return {
        "sym":    sym,
        "name":   name,
        "sector": sector,
        "price":  round(5 + rng.random() * 800, 2),
        "chg":    round(rng.uniform(-2.7, 3.3), 2),
        "daily":  rand_score(bias, 22),
        "weekly": rand_score(bias - 5, 22),
    }


ndx_list = list(NDX_SEED)
pad_to(ndx_list, 100)
ndx_rows = [make_stock_row(s, n, sec, 60) for s, n, sec in ndx_list[:100]]

spx_start = [(s, n, sec) for s, n, sec in NDX_SEED[:60]]  # overlap w/ NDX
spx_start += SPX_EXTRA
seen = set()
spx_list = []
for row in spx_start:
    if row[0] in seen: continue
    seen.add(row[0])
    spx_list.append(row)
pad_to(spx_list, 500)
spx_rows = [make_stock_row(s, n, sec, 52) for s, n, sec in spx_list[:500]]


# ---------------------------------------------------------------- Write
out = {
    "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    "indexes":    INDEXES,
    "sectors":    sector_rows,
    "stocks":     {"ndx": ndx_rows, "spx": spx_rows},
}

target = Path(__file__).resolve().parent / "scores.json"
target.write_text(json.dumps(out, indent=2))
print(f"Wrote {target}  ({len(ndx_rows)} NDX, {len(spx_rows)} SPX, {len(sector_rows)} sectors)")
