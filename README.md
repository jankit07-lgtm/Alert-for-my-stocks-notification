# StonksAI · Alert for My Stock (prototype)

Clickable prototype of the **Alert for My Stock** feature on the Stocks page: a user watches a stock and gets a push notification when one of four conditions is met.

1. Price reaches **indicative support** and RSI shows **bullish divergence**
2. Price reaches **indicative resistance** and RSI shows **bearish divergence**
3. The stock is **picked in this week's plan** (Universe stocks only)
4. **All four weekly scores are 60+** (Universe stocks only)

The user is on the **Ultra** plan (20 alert slots) so every case can be shown.

## What's real and what's mock

| Part | Source |
|---|---|
| Daily OHLCV prices to Nov 9, 2026 | Polygon (via Massive). MSFT and MU have 2 years of history; NVDA, AAPL and SOFI have 1 year |
| Support/resistance zones, RSI, divergence, ATR | Calculated from those prices by `engine/levels.py` (method `swing_v1`) |
| Chart markers / past alerts | A replay of the alert rules over the last ~90 trading days, using only data available on each day |
| Weekly scores (FQS, TMS, DVES, SMAS) and plan picks | **Mock data**, scripted so each alert type appears at least once |
| Fundamentals and news | Left out; unchanged by this feature |

SOFI is treated as **not in the Universe** to show the locked-conditions case.

## Try it

The page shows a phone on the left and **Demo controls** on the right (on a phone, tap the **Demo** button).

**Happy path:** search → MU → *Alert me about MU* → *Start watching* → fire an alert from the demo panel → tap the push banner → *View MU on the Stocks page* → tap the bell for all alerts and **My Alerts**.

**Edge cases in the demo panel:** push permission off (alert lands in the bell only), cooldown (second alert suppressed), condition met on an unwatched stock (nothing sent), stock leaves the Universe (plan/score alerts paused), all 20 slots full, watched ticker delisted, several conditions at once (bundled), and AAPL at an all-time high (no resistance → paused).

Demo state is kept in the browser. Use **Reset demo** to start over.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173
```

## Deploy to Vercel

1. Push this folder to a new GitHub repo, for example `stonks-stock-alerts-prototype`:
   ```powershell
   git init
   git add .
   git commit -m "Alert for My Stock prototype"
   git branch -M main
   git remote add origin git@github.com:<your-account>/stonks-stock-alerts-prototype.git
   git push -u origin main
   ```
2. In Vercel: **Add New → Project → Import** the repo. It detects Vite; keep the defaults (build `npm run build`, output `dist`).
3. Share the `*.vercel.app` link. No API keys or environment variables are needed; the data is baked into `public/data/`.

## Refresh the data

`engine/raw/*.txt` holds compact daily bars (`day-offset,open,high,low,close,volume/100k`). After replacing them with newer Polygon data:

```bash
pip install pandas numpy
npm run data       # rewrites public/data/*.json
```

## Support/resistance method (swing_v1)

Swing highs/lows (5 bars each side) → keep swings with a reaction of at least 1.5 ATR within 10 bars → cluster within 0.5 ATR (max zone width 1 ATR) → score each zone by touches 35%, recency 25% (126-day decay), reaction 25%, volume 10%, role reversal 5% → nearest zone with strength ≥ 40 below price is support, above is resistance. Recalculated daily.

**Alert rules used in the replay:** price enters the zone and closes near it; divergence compares with a confirmed swing 10–60 bars earlier (RSI at least 5 points apart; prior RSI below 45 for bullish, above 55 for bearish); re-arms only after price moves more than 1 ATR from the level and at least 5 trading days have passed.

## Files

```
engine/levels.py          levels, divergence and alert replay (Python)
engine/raw/               Polygon daily bars
public/data/              generated JSON the app reads
src/App.jsx               state, alert firing, edge cases
src/components/           Stocks page, chart, sheets, notification center, demo panel
src/lib/alerts.js         conditions, notification copy, helpers
```
