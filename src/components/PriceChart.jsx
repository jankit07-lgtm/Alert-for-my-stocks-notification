import { useEffect, useRef, useState } from 'react';
import { createChart, CrosshairMode } from 'lightweight-charts';
import { Maximize2 } from 'lucide-react';
import { money } from '../lib/alerts';

const RANGES = [
  ['1M', 21],
  ['3M', 63],
  ['6M', 126],
  ['1Y', 252],
  ['2Y', 9999],
];

const MARK = {
  support: { color: '#4FE682', shape: 'arrowUp', position: 'belowBar', text: 'S' },
  resistance: { color: '#FF4B4B', shape: 'arrowDown', position: 'aboveBar', text: 'R' },
  plan: { color: '#5DBAFF', shape: 'circle', position: 'aboveBar', text: 'P' },
  scores: { color: '#FFC21A', shape: 'circle', position: 'aboveBar', text: '60' },
};

export default function PriceChart({ stock, focusDate, showMarkers }) {
  const box = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const bands = useRef({});
  const [range, setRange] = useState('3M');
  const [offscreen, setOffscreen] = useState({});

  // When a notification asks us to focus a date, pick a range that includes it.
  useEffect(() => {
    if (!focusDate) return;
    const idx = stock.bars.findIndex((b) => b[0] >= focusDate);
    const back = stock.bars.length - idx;
    const r = RANGES.find(([, n]) => n >= back + 10) || RANGES[RANGES.length - 1];
    setRange(r[0]);
  }, [focusDate, stock.symbol]);

  useEffect(() => {
    const el = box.current;
    const chart = createChart(el, {
      height: 260,
      layout: { background: { color: 'transparent' }, textColor: '#9F9FB1', fontFamily: 'Urbanist' },
      grid: { vertLines: { color: 'rgba(59,57,88,.35)' }, horzLines: { color: 'rgba(59,57,88,.35)' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.08 } },
      timeScale: { borderVisible: false, fixLeftEdge: true, fixRightEdge: true },
      crosshair: { mode: CrosshairMode.Normal },
      handleScroll: false,
      handleScale: false,
    });
    const s = chart.addCandlestickSeries({
      upColor: '#139756', downColor: '#FF6B6B', borderVisible: false,
      wickUpColor: '#139756', wickDownColor: '#FF6B6B', priceLineVisible: false,
    });
    const ma = chart.addLineSeries({ color: '#5DBAFF', lineWidth: 2, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
    chartRef.current = { chart, ma };
    seriesRef.current = s;
    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);

    // Keep the translucent zone bands aligned with the price scale.
    let raf;
    const tick = () => {
      const lv = stock.levels;
      const next = {};
      for (const key of ['support', 'resistance']) {
        const z = lv[key];
        const node = bands.current[key];
        if (!node) continue;
        if (!z) { node.style.display = 'none'; continue; }
        const yTop = s.priceToCoordinate(z.high);
        const yBot = s.priceToCoordinate(z.low);
        const h = el.clientHeight - 26;
        if (yTop == null || yBot == null || yBot < 0 || yTop > h) {
          node.style.display = 'none';
          next[key] = yBot != null && yBot < 0 ? 'up' : 'down';
          continue;
        }
        node.style.display = 'block';
        const top = Math.max(0, yTop);
        node.style.top = `${top}px`;
        node.style.height = `${Math.max(3, Math.min(h, yBot) - top)}px`;
      }
      setOffscreen((o) => (o.support === next.support && o.resistance === next.resistance ? o : next));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); chart.remove(); };
  }, [stock.symbol]);

  useEffect(() => {
    const s = seriesRef.current;
    const { chart, ma } = chartRef.current;
    const n = RANGES.find(([k]) => k === range)[1];
    const bars = stock.bars.slice(-Math.min(n, stock.bars.length));
    s.setData(bars.map(([time, open, high, low, close]) => ({ time, open, high, low, close })));
    // 20-day moving average (as on the current Stocks page)
    const all = stock.bars;
    const start = all.length - bars.length;
    const maData = [];
    for (let i = Math.max(start, 19); i < all.length; i++) {
      let sum = 0;
      for (let j = i - 19; j <= i; j++) sum += all[j][4];
      maData.push({ time: all[i][0], value: +(sum / 20).toFixed(2) });
    }
    ma.setData(maData);
    const first = bars[0][0];
    const marks = showMarkers
      ? stock.events
          .filter((e) => e.date >= first)
          .map((e) => {
            // weekly events are dated Monday; snap to a trading day present in the data
            const bar = stock.bars.find((b) => b[0] >= e.date) || stock.bars[stock.bars.length - 1];
            const m = MARK[e.type];
            const focused = focusDate && e.date === focusDate;
            return { time: bar[0], position: m.position, color: m.color, shape: m.shape, text: focused ? `● ${m.text}` : m.text, size: focused ? 2 : 1 };
          })
          .sort((a, b) => (a.time < b.time ? -1 : 1))
      : [];
    s.setMarkers(marks);
    chart.timeScale().fitContent();
  }, [range, stock.symbol, showMarkers, focusDate]);

  const lv = stock.levels;
  const ma20 = (() => {
    const b = stock.bars.slice(-20);
    return b.reduce((a, x) => a + x[4], 0) / b.length;
  })();

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {RANGES.map(([k]) => (
            <button key={k} onClick={() => setRange(k)}
              className={`h-8 w-11 rounded-md text-[13px] font-medium ${k === range ? 'bg-stonks-brand' : 'bg-stonks-chip'}`}>{k}</button>
          ))}
        </div>
        <button className="h-9 w-9 rounded-xl bg-stonks-surface3 grid place-items-center" aria-label="Expand chart">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold">
        <span className="text-stonks-info">— 20D MA {money(ma20)}</span>
        {lv.support && <span className="text-stonks-gauge">▮ Support zone</span>}
        {lv.resistance && <span className="text-stonks-loss">▮ Resistance zone</span>}
      </div>
      <div className="relative mt-1">
        <div ref={box} className="w-full" />
        <div ref={(n) => (bands.current.support = n)} className="pointer-events-none absolute left-0 right-[58px] bg-[#4FE682]/15 border-y border-[#4FE682]/50" style={{ display: 'none' }} />
        <div ref={(n) => (bands.current.resistance = n)} className="pointer-events-none absolute left-0 right-[58px] bg-[#FF4B4B]/15 border-y border-[#FF4B4B]/50" style={{ display: 'none' }} />
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {offscreen.support && lv.support && (
          <div className="rounded-md bg-stonks-surface3 px-2 py-0.5 text-[11px] text-stonks-gauge">
            ↓ Support {money(lv.support.low)}–{lv.support.high.toFixed(2)} ({lv.support.dist_pct.toFixed(1)}%)
          </div>
        )}
        {offscreen.resistance && lv.resistance && (
          <div className="rounded-md bg-stonks-surface3 px-2 py-0.5 text-[11px] text-stonks-loss">
            ↑ Resistance {money(lv.resistance.low)}–{lv.resistance.high.toFixed(2)} (+{lv.resistance.dist_pct.toFixed(1)}%)
          </div>
        )}
        {!lv.resistance && (
          <div className="rounded-md bg-stonks-surface3 px-2 py-0.5 text-[11px] text-stonks-highlight">
            Price discovery — no resistance above
          </div>
        )}
      </div>
      {showMarkers && (
        <div className="mt-1 text-[11px] text-stonks-muted">
          Markers show when each alert would have fired:
          <span className="text-stonks-gauge"> ▲S</span> support ·
          <span className="text-stonks-loss"> ▼R</span> resistance ·
          <span className="text-stonks-info"> P</span> plan ·
          <span className="text-stonks-amber"> 60</span> scores
        </div>
      )}
    </div>
  );
}
