// Alert rules, copy and helpers for the "Alert for My Stock" prototype.

export const TIER = { name: 'Ultra', limit: 20 };

export const CONDITIONS = [
  {
    key: 'support',
    title: 'At support + bullish divergence',
    short: 'Support + bullish div.',
    desc: 'Price enters the support zone while RSI makes a higher low.',
    universeOnly: false,
  },
  {
    key: 'resistance',
    title: 'At resistance + bearish divergence',
    short: 'Resistance + bearish div.',
    desc: 'Price enters the resistance zone while RSI makes a lower high.',
    universeOnly: false,
  },
  {
    key: 'plan',
    title: "Picked in this week's plan",
    short: 'Weekly plan pick',
    desc: 'The stock is recommended in the StonksAI weekly plan.',
    universeOnly: true,
  },
  {
    key: 'scores',
    title: 'All four scores 60+',
    short: 'All scores 60+',
    desc: 'FQS, TMS, DVES and SMAS all reach 60 or higher in the weekly refresh.',
    universeOnly: true,
  },
];

export const condByKey = Object.fromEntries(CONDITIONS.map((c) => [c.key, c]));

export const money = (n) =>
  n == null ? '—' : `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const signed = (n, d = 2) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}`;
export const zoneText = (z) => (z ? `${money(z.low)}–${money(z.high).slice(1)}` : '—');

export const fmtDate = (iso, opts = { month: 'short', day: 'numeric' }) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });

// Timestamp a historical event at a realistic delivery time (ET → epoch ms).
export function eventTime(e) {
  const hourUtc = e.type === 'plan' || e.type === 'scores' ? 12 : 20; // 7am ET Monday refresh vs 3-4pm ET intraday
  return Date.parse(`${e.date}T${String(hourUtc).padStart(2, '0')}:${e.type === 'support' ? '10' : '25'}:00Z`);
}

export function currentWeek(stock) {
  return stock.weeks[stock.weeks.length - 1];
}

export function liveStatus(stock) {
  const w = currentWeek(stock);
  const lv = stock.levels;
  return {
    support: lv.state === 'testing_support' ? 'Price is inside the support zone now' : null,
    resistance: lv.state === 'testing_resistance' ? 'Price is inside the resistance zone now' : null,
    plan: stock.universe && w.in_plan ? "Already in this week's plan" : null,
    scores: stock.universe && w.scores && Math.min(...w.scores) >= 60 ? 'All four scores are 60+ this week' : null,
  };
}

// Build notification copy from an event. Copy stays descriptive (no "buy"/"sell").
export function buildNotification(stock, e, extra = {}) {
  const s = stock.symbol;
  let title, body, tone;
  if (e.type === 'support') {
    tone = 'bull';
    title = `${s} is at support with bullish divergence`;
    body = `Closed ${money(e.price)} inside its ${money(e.zone[0])}–${e.zone[1].toFixed(2)} support zone. RSI made a higher low (${e.divergence.cur_rsi} vs ${e.divergence.prior_rsi}) while price made a lower low.`;
  } else if (e.type === 'resistance') {
    tone = 'bear';
    title = `${s} is at resistance with bearish divergence`;
    body = `Closed ${money(e.price)} inside its ${money(e.zone[0])}–${e.zone[1].toFixed(2)} resistance zone. RSI made a lower high (${e.divergence.cur_rsi} vs ${e.divergence.prior_rsi}) while price made a higher high.`;
  }
  if (e.type === 'plan') {
    tone = 'brand';
    title = `${s} is in this week's StonksAI plan`;
    body = `${stock.name} was picked in the weekly plan for the week of ${fmtDate(e.date)}. Open the plan to review the setup.`;
  } else if (e.type === 'scores') {
    tone = 'brand';
    const [f, t, d, m] = e.scores;
    title = `${s} now scores 60+ on all four`;
    body = `FQS ${f} · TMS ${t} · DVES ${d} · SMAS ${m} in the weekly refresh for ${fmtDate(e.date)}.`;
  } else if (e.type === 'bundle') {
    tone = 'brand';
    title = `${s}: ${e.parts.length} alerts at once`;
    body = e.parts.map((p) => condByKey[p.type].short).join(' · ') + '. Tap to see each one.';
  } else if (e.type === 'system') {
    tone = 'muted';
    title = e.title;
    body = e.body;
  }
  if (e.synthetic) {
    body = e.type === 'support' || e.type === 'resistance'
      ? `Example only: ${s} hasn't met this condition in the backtest window. ${body}`
      : `Example only: not true for ${s} this week (mock data). ${body}`;
  }
  return {
    id: extra.id || `${s}-${e.type}-${e.date}-${Math.random().toString(36).slice(2, 7)}`,
    symbol: s,
    type: e.type,
    event: e,
    title,
    body,
    tone,
    ts: extra.ts ?? eventTime(e),
    read: extra.read ?? false,
    simulated: !!extra.simulated,
    delivered: extra.delivered || 'push',
  };
}

// Make a simulated price event for the demo panel when the stock has no real one.
export function synthPriceEvent(stock, type) {
  const real = [...stock.events].reverse().find((e) => e.type === type);
  if (real) return { event: real, replay: true };
  const zone = type === 'support' ? stock.levels.support : stock.levels.resistance;
  const rsi = stock.technicals.rsi;
  const z = zone || {
    low: stock.price * (type === 'support' ? 0.97 : 1.02),
    high: stock.price * (type === 'support' ? 0.98 : 1.03),
    strength: 50,
  };
  const price = type === 'support' ? z.high : z.low;
  return {
    replay: false,
    event: {
      type,
      synthetic: true,
      date: stock.asOf,
      price: +price.toFixed(2),
      zone: [z.low, z.high],
      strength: z.strength,
      divergence:
        type === 'support'
          ? { prior_rsi: +(Math.min(rsi, 40) - 8).toFixed(1), cur_rsi: +Math.min(rsi, 40).toFixed(1), prior_price: +(price * 1.01).toFixed(2), cur_price: price, prior_date: stock.asOf }
          : { prior_rsi: +(Math.max(rsi, 62) + 8).toFixed(1), cur_rsi: +Math.max(rsi, 62).toFixed(1), prior_price: +(price * 0.99).toFixed(2), cur_price: price, prior_date: stock.asOf },
    },
  };
}

export function timeAgo(ts, now) {
  const m = Math.round((now - ts) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 7 ? `${d}d ago` : fmtDate(new Date(ts).toISOString().slice(0, 10));
}
