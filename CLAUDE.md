# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies (jose, cookie, resend, acorn — used by _worker.js)
npm install

# Deploy to Cloudflare (bundles _worker.js + uploads static assets)
npx wrangler deploy

# Dry-run deploy (verify build without publishing)
npx wrangler deploy --dry-run

# Run D1 migrations against the remote database
npx wrangler d1 migrations apply stock-score

# Run the unit test suite (Node built-in test runner, no extra install needed)
npm test

# Regenerate scores.json with seeded random data
python3 build_scores.py

# Regenerate breadth.json (~10 years of simulated S&P breadth data)
python3 build_breadth.py

# Fetch 2 years of real price data via yfinance and regenerate ai_layers.json
# Requires: pip install yfinance pandas
python3 build_ai_layers.py

# One-time backfill: replay git history to populate history_weekly/history_daily
python3 build_history.py

# Copy freshly built data files from sibling repo, accumulate score history, commit & push
python3 deploy_data.py
```

There is no lint step or local dev server configured. To test locally, serve the directory over HTTP (e.g. `python3 -m http.server 8000`) — `fetch()` is blocked on `file://`.

`deploy_data.py` expects a sibling directory `../stock-analysis` (another clone of this repo) and a sibling script `run_daily_calc.py` that produces the source `scores.json` and `breadth.json`.

## Architecture

This is a **static-first dashboard** hosted on Cloudflare Pages + Workers. There is no build step for the frontend; everything is plain HTML/CSS/JS.

### Request flow
1. Cloudflare Pages serves static files (HTML, JS, JSON, images).
2. Requests matching `/api/auth/*`, `/api/feedback`, and `/api/feedbacks` are intercepted by **`_worker.js`** — a Cloudflare Worker that handles all server-side logic. Wrangler bundles this file (with `jose`, `cookie`, and `resend` from `node_modules`) at deploy time.
3. Static assets listed in **`.assetsignore`** are excluded from the Pages upload (e.g. `_worker.js` itself, Python scripts, `migrations/`).

### Frontend (`index.html`)
Single-page app — all tabs live in one HTML file with hash routing (`#/overview`, `#/breadth`, `#/ai-layers`, `#/articles`).

- **Tab views** are `<section class="view" data-tab="…">` elements toggled by JS.
- **i18n** is handled entirely by `translations.js`. All UI strings live there; `data-i18n` sets `textContent`, `data-i18n-html` sets `innerHTML`. `applyI18n()` skips DOM updates when a key is missing (returns `null`) so hardcoded HTML fallbacks stay visible — important for cache-mismatch resilience on Cloudflare.
- **Scores data** is loaded by polling `scores.updated_at.txt` (cheap); only fetches `scores.json` when the timestamp changes. Same pattern for `breadth.updated_at.txt` / `breadth.json` and `ai_layers.updated_at.txt` / `ai_layers.json`.
- **Breadth chart** (Chart.js) is lazy-loaded — `chart.js` and `chartjs-adapter-date-fns` CDN scripts are injected only when the breadth tab is first visited. The AI Layers tab uses the same lazy-load pattern.
- **Articles** are defined in `articles.js` as a plain JS array with bilingual `title`/`summary`/`content` fields.

### Data pipeline
- `scores.json` — indexes, sectors, and constituent stocks with daily/weekly scores (0–100) plus rolling 20-point history arrays (`history_daily`, `history_weekly`). Also supports an optional `stocks.watchlist` array. Updated externally by `deploy_data.py`.
- `breadth.json` — time series of S&P 500 price + `above_ma50` / `above_ma200` breadth percentages.
- `ai_layers.json` — 2-year indexed-to-100 performance series for five AI thematic baskets (Energy, Chips & Compute, Infrastructure, Models, Applications). Built by `build_ai_layers.py` using `yfinance`.
- Each data file has a companion `*.updated_at.txt` pointer so clients can poll cheaply.

#### Data file JSON contracts

**`scores.json`**
```json
{
  "updated_at": "ISO-8601",
  "indexes": [{ "sym", "name", "price", "chg", "daily", "weekly" }],
  "sectors": [{ "sym", "name", "price", "chg", "daily", "weekly" }],
  "stocks": {
    "ndx": [{ "sym", "name", "sector", "price", "chg", "daily", "weekly", "history_daily", "history_weekly" }],
    "spx": [...],
    "watchlist": [...]
  }
}
```

**`breadth.json`**
```json
{
  "updated_at": "ISO-8601",
  "series": [{ "date": "YYYY-MM-DD", "price": 5321.42, "above_ma50": 62.3, "above_ma200": 55.1 }]
}
```

**`ai_layers.json`**
```json
{
  "updated_at": "YYYY-MM-DD",
  "layers": [
    { "name": "AI Energy", "tickers": ["CEG", ...], "series": [{ "date": "YYYY-MM-DD", "value": 100.0 }] }
  ]
}
```

### Auth (`_worker.js`)
- **Local auth**: PBKDF2 password hashing (100k iterations, SHA-256, random 16-byte salt stored as `salt:hash`). Legacy SHA-256 (no salt) passwords are transparently upgraded on next login.
- **JWT**: HS256 signed with `JWT_SECRET`, stored in an `HttpOnly; Secure; SameSite=Lax` cookie (`auth_token`). Expires after 7 days.
- **OAuth**: Google and Facebook (currently disabled in the UI). CSRF state stored in a short-lived (10 min) `HttpOnly` cookie (`oauth_state`). Provider-scoped email lookup prevents cross-provider account takeover.
- **Password reset**: `randomTokenBase64Url(32)` raw token sent in email; only its SHA-256 hash stored in DB. Expires in 1 hour; prior unused tokens for the same user are purged on each new request. Email sent via Resend SDK (`RESEND_API_KEY` env secret).
- **Feedback**: `POST /api/feedback` — anonymous or authenticated. `GET /api/feedbacks` — admin-only (checks `is_admin` in DB).
- **DB**: Cloudflare D1 (`env.DB` binding, database name `stock-score`). Migrations in `migrations/`.
- **Cookie serialization**: `serializeCookie.js` — a tiny helper imported by the worker (also tested by the unit test).

#### Required env secrets (set with `wrangler secret put <NAME>`)
| Secret | Purpose |
|---|---|
| `JWT_SECRET` | Signs/verifies auth JWTs |
| `RESEND_API_KEY` | Sends password-reset emails |
| `FROM_EMAIL` | Sender address for reset emails |
| `GOOGLE_CLIENT_ID` | Google OAuth (optional) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth (optional) |
| `FACEBOOK_CLIENT_ID` | Facebook OAuth (optional) |
| `FACEBOOK_CLIENT_SECRET` | Facebook OAuth (optional) |

### DB schema (D1 — `stock-score`)

```sql
-- migration 0000
CREATE TABLE users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,          -- "salt:hash" (PBKDF2) or plain hex (legacy SHA-256)
    provider TEXT DEFAULT 'local',
    provider_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- migration 0001_add_admin_and_feedback
ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0;

CREATE TABLE feedbacks (
    id TEXT PRIMARY KEY,
    user_id TEXT,                -- nullable (anonymous allowed)
    username TEXT,
    type TEXT,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

-- migration 0001_password_resets
CREATE TABLE password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    expires_at INTEGER NOT NULL, -- Unix timestamp
    used_at INTEGER,             -- Unix timestamp, NULL until consumed
    FOREIGN KEY (user_id) REFERENCES users(id)
);
CREATE INDEX idx_password_resets_user ON password_resets(user_id);
```

> **Note**: There are two migration files both numbered `0001` (`0001_add_admin_and_feedback.sql` and `0001_password_resets.sql`). Both must be applied.

### Cache / deploy notes
- `.js` files are served with `Cache-Control: immutable, max-age=31536000`. Bump the `?v=N` query string on any `<script src="…">` tag in `index.html` when deploying a changed JS file (e.g. `translations.js?v=3`).
- `.html` and `.json` files are `no-cache / must-revalidate` — always fresh.
- `package.json` must have `"type": "module"` for Wrangler to correctly bundle the ESM worker.
- `wrangler.jsonc` enables `observability` (Cloudflare logs) and the `nodejs_compat` compatibility flag required by the `resend` SDK.
