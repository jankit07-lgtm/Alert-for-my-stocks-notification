import { useEffect, useMemo, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { TopBar, BottomNav, SaiButton, Toast } from './components/ui';
import StockScreen from './components/StockScreen';
import { AlertSheet, SearchSheet, LevelsInfoSheet, AlertDetailSheet } from './components/Sheets';
import { NotificationCenter, PushBanner } from './components/Notifications';
import DemoPanel from './components/DemoPanel';
import { TIER, CONDITIONS, buildNotification, synthPriceEvent, currentWeek, condByKey } from './lib/alerts';

const SYMBOLS = ['MSFT', 'MU', 'NVDA', 'AAPL', 'SOFI'];
const allOn = (stock) => Object.fromEntries(CONDITIONS.map((c) => [c.key, !(c.universeOnly && !stock.universe)]));
const WATCH_SINCE = '2026-09-01';

function initialState(stocks) {
  const watches = {};
  const notifs = [];
  for (const sym of ['MSFT', 'NVDA']) {
    watches[sym] = { conditions: allOn(stocks[sym]), since: WATCH_SINCE };
    for (const e of stocks[sym].events) {
      if (e.date >= WATCH_SINCE) notifs.push(buildNotification(stocks[sym], e, { read: true }));
    }
  }
  // the two most recent arrive unread
  notifs.sort((a, b) => b.ts - a.ts).slice(0, 2).forEach((n) => (n.read = false));
  return { watches, notifs, extraSlots: 0, overrides: {}, cooldown: {}, pushOn: true };
}

const STORE_KEY = 'stonks-alerts-demo-v1';
const load = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } };
const save = (s) => { try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch { /* ignore */ } };

export default function App() {
  const [raw, setRaw] = useState(null);
  useEffect(() => {
    Promise.all(SYMBOLS.map((s) => fetch(`/data/${s}.json`).then((r) => r.json()))).then((arr) =>
      setRaw(Object.fromEntries(arr.map((s) => [s.symbol, s]))),
    );
  }, []);
  if (!raw) return <div className="h-full grid place-items-center text-stonks-muted">Loading market data…</div>;
  return <Prototype raw={raw} />;
}

function Prototype({ raw }) {
  const [st, setSt] = useState(() => load() || initialState(raw));
  useEffect(() => save(st), [st]);
  const set = (fn) => setSt((p) => ({ ...p, ...fn(p) }));

  // Apply demo overrides (e.g. a stock that left the Universe).
  const stocks = useMemo(() => {
    const o = {};
    for (const [k, s] of Object.entries(raw)) o[k] = st.overrides[k] ? { ...s, ...st.overrides[k] } : s;
    return o;
  }, [raw, st.overrides]);

  const [symbol, setSymbol] = useState('MSFT');
  const [view, setView] = useState('stock');
  const [sheet, setSheet] = useState(null); // {kind, ...}
  const [banner, setBanner] = useState(null);
  const [toast, setToast] = useState(null);
  const [focusDate, setFocusDate] = useState(null);
  const [target, setTarget] = useState('MU');
  const [demoOpen, setDemoOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const scroller = useRef(null);
  const timers = useRef({});

  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(i); }, []);

  const stock = stocks[symbol];
  const watchCount = Object.keys(st.watches).length + st.extraSlots;
  const unread = st.notifs.filter((n) => !n.read).length;

  const flash = (text, kind) => {
    setToast({ text, kind });
    clearTimeout(timers.current.toast);
    timers.current.toast = setTimeout(() => setToast(null), 3800);
  };
  const showBanner = (n) => {
    setBanner(n);
    clearTimeout(timers.current.banner);
    timers.current.banner = setTimeout(() => setBanner(null), 7000);
  };
  const addNotif = (n) => {
    set((p) => ({ notifs: [n, ...p.notifs] }));
    if (st.pushOn && n.delivered === 'push') showBanner(n);
    else if (n.delivered === 'inapp') flash('Push is off, so this alert went to the bell only.', 'warn');
  };

  const openStock = (sym, date = null) => {
    setSymbol(sym); setView('stock'); setSheet(null); setFocusDate(date);
    requestAnimationFrame(() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  // ---------- firing alerts (demo) ----------
  function fire(type, sym = target, { ignoreCooldown = false } = {}) {
    const s = stocks[sym];
    const w = st.watches[sym];
    if (!w) return flash(`You're not watching ${sym}, so no alert is sent. Open ${sym} and tap “Alert me”.`, 'warn');
    const check = (t) => {
      const c = condByKey[t];
      if (c.universeOnly && !s.universe) return `${c.short} isn't available for ${sym}: it's not in the Universe.`;
      if (!w.conditions[t]) return `${c.short} is turned off for ${sym}.`;
      if (t === 'resistance' && !s.levels.resistance) return `${sym} is in price discovery: no resistance zone, so this alert is paused.`;
      if (t === 'support' && !s.levels.support) return `${sym} has no nearby support zone, so this alert is paused.`;
      const key = `${sym}-${t}`;
      if (!ignoreCooldown && st.cooldown[key])
        return t === 'support' || t === 'resistance'
          ? `Suppressed: ${sym} ${t} alert already sent. It re-arms after price moves more than 1 ATR away from the zone.`
          : `Suppressed: the ${condByKey[t].short.toLowerCase()} alert for ${sym} was already sent this week.`;
      return null;
    };
    const make = (t) => {
      if (t === 'support' || t === 'resistance') return synthPriceEvent(s, t).event;
      const wk = currentWeek(s);
      if (t === 'plan') return { type: 'plan', date: wk.week, synthetic: !wk.in_plan };
      const real = wk.scores && Math.min(...wk.scores) >= 60;
      return { type: 'scores', date: wk.week, scores: real ? wk.scores : [64, 61, 63, 67], synthetic: !real };
    };
    let event;
    if (type === 'bundle') {
      const parts = ['support', 'plan', 'scores', 'resistance'].filter((t) => !check(t)).slice(0, 2);
      if (parts.length < 2) return flash(`Not enough eligible conditions on ${sym} to bundle. Try a Universe stock you watch.`, 'warn');
      event = { type: 'bundle', date: s.asOf, parts: parts.map(make) };
      set((p) => ({ cooldown: { ...p.cooldown, ...Object.fromEntries(parts.map((t) => [`${sym}-${t}`, true])) } }));
    } else {
      const why = check(type);
      if (why) return flash(why, 'warn');
      event = make(type);
      set((p) => ({ cooldown: { ...p.cooldown, [`${sym}-${type}`]: true } }));
    }
    addNotif(buildNotification(s, event, { ts: Date.now(), simulated: true, delivered: st.pushOn ? 'push' : 'inapp' }));
  }

  function edge(kind) {
    const s = stocks[target];
    if (kind === 'push') {
      set((p) => ({ pushOn: !p.pushOn }));
      return flash(st.pushOn ? 'Push permission is now off (as if denied in phone settings). Fire an alert to see what happens.' : 'Push is back on.');
    }
    if (kind === 'cooldown') {
      const sym = Object.keys(st.watches).find((k) => stocks[k]?.levels.support) || target;
      fire('support', sym, { ignoreCooldown: true });
      setTimeout(() => fire('support', sym), 1800);
      return;
    }
    if (kind === 'unwatched') {
      const sym = SYMBOLS.find((k) => !st.watches[k]);
      if (!sym) return flash('You watch every demo stock. Remove one first.', 'warn');
      return fire('support', sym);
    }
    if (kind === 'universe') {
      if (!s.universe) return flash(`${target} is already outside the Universe.`, 'warn');
      set((p) => ({
        overrides: { ...p.overrides, [target]: { universe: false } },
        watches: p.watches[target] ? { ...p.watches, [target]: { ...p.watches[target], pausedReason: 'Left the Universe · plan and score alerts paused' } } : p.watches,
      }));
      if (st.watches[target]) {
        addNotif(buildNotification(s, { type: 'system', date: s.asOf, title: `${target} left the StonksAI Universe`, body: 'Plan and score alerts are paused. Price alerts keep running. They resume if it rejoins.' }, { ts: Date.now(), simulated: true, delivered: st.pushOn ? 'push' : 'inapp' }));
      } else flash(`${target} left the Universe. Watch it to see paused conditions.`);
      return;
    }
    if (kind === 'slots') {
      set((p) => ({ extraSlots: Math.max(0, TIER.limit - Object.keys(p.watches).length) }));
      return flash(`All ${TIER.limit} slots are now in use (placeholder stocks). Try to add an alert.`);
    }
    if (kind === 'delist') {
      const n = buildNotification(s, { type: 'system', date: s.asOf, title: 'XMPL was delisted', body: 'We removed your XMPL alert and freed the slot. (Fictional ticker for the demo.)' }, { ts: Date.now(), simulated: true, delivered: st.pushOn ? 'push' : 'inapp' });
      n.symbol = 'XMPL';
      return addNotif(n);
    }
  }

  function reset() {
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    setSt(initialState(raw)); setSymbol('MSFT'); setView('stock'); setSheet(null); setBanner(null); setFocusDate(null);
    flash('Demo reset. You watch MSFT and NVDA.');
  }

  function openNotif(n) {
    set((p) => ({ notifs: p.notifs.map((x) => (x.id === n.id ? { ...x, read: true } : x)) }));
    setBanner(null);
    if (n.type === 'system') return flash(n.body);
    setSheet({ kind: 'detail', notif: n });
  }

  const lastFired = useMemo(() => {
    const out = {};
    for (const n of st.notifs) {
      if (n.symbol !== symbol) continue;
      const parts = n.type === 'bundle' ? n.event.parts : [n.event];
      for (const p of parts) if (!out[p.type] || p.date > out[p.type]) out[p.type] = p.date;
    }
    return out;
  }, [st.notifs, symbol]);

  const phone = (
    <div className="relative w-full h-full sm:w-[390px] sm:h-[844px] sm:rounded-[48px] overflow-hidden flex flex-col bg-stonks-bg sm:ring-[10px] sm:ring-[#1a1a1f] sm:shadow-2xl">
      <div className="h-11 shrink-0 flex items-center justify-between px-7 text-[15px] font-semibold">
        <span>9:41</span><span className="text-[11px] tracking-widest">●●● ▮▮</span>
      </div>
      <TopBar unread={unread} onBell={() => setView(view === 'notifs' ? 'stock' : 'notifs')} bellActive={view === 'notifs'} />
      <div ref={scroller} className="flex-1 overflow-y-auto no-scrollbar">
        <StockScreen stock={stock} watch={st.watches[symbol]} watchCount={watchCount} focusDate={focusDate} lastFired={lastFired}
          onSearch={() => setSheet({ kind: 'search' })}
          onAlert={() => setSheet({ kind: 'alert' })}
          onManage={() => setSheet({ kind: 'alert' })}
          onLevelsInfo={() => setSheet({ kind: 'levels' })} />
      </div>
      {view === 'notifs' && (
        <NotificationCenter notifs={st.notifs} stocks={stocks} watches={st.watches} now={now} pushOn={st.pushOn}
          onEnablePush={() => set(() => ({ pushOn: true }))}
          onOpen={openNotif} onBack={() => setView('stock')} onOpenStock={(s) => openStock(s)}
          onMarkAll={() => set((p) => ({ notifs: p.notifs.map((n) => ({ ...n, read: true })) }))}
          onEdit={(s) => { setSymbol(s); setSheet({ kind: 'alert' }); }} />
      )}
      <SaiButton />
      <BottomNav />
      <button onClick={() => setDemoOpen(true)} className="lg:hidden absolute left-3 bottom-[92px] z-20 flex items-center gap-1.5 rounded-full bg-[#2b2b38] px-3 py-2 text-[12px] font-semibold ring-1 ring-white/10">
        <SlidersHorizontal className="h-4 w-4" /> Demo
      </button>

      {sheet?.kind === 'search' && (
        <SearchSheet stocks={Object.values(stocks)} current={symbol} watches={st.watches}
          onPick={(s) => { openStock(s); setTarget(s); }} onClose={() => setSheet(null)} />
      )}
      {sheet?.kind === 'levels' && <LevelsInfoSheet stock={stock} onClose={() => setSheet(null)} />}
      {sheet?.kind === 'alert' && (
        <AlertSheet key={symbol} stock={stock} watch={st.watches[symbol]} watchCount={watchCount} limit={TIER.limit}
          onClose={() => setSheet(null)}
          onUpgradeReplace={() => { setSheet(null); setView('notifs'); flash('Open My Alerts and remove one to free a slot.'); }}
          onSave={(conditions) => {
            const isNew = !st.watches[symbol];
            set((p) => ({ watches: { ...p.watches, [symbol]: { ...(p.watches[symbol] || {}), conditions, since: stock.asOf } } }));
            setSheet(null); setTarget(symbol);
            flash(isNew ? `Watching ${symbol}. We'll notify you when a condition is met.` : `Alert for ${symbol} updated.`);
          }}
          onRemove={() => {
            set((p) => { const w = { ...p.watches }; delete w[symbol]; return { watches: w }; });
            setSheet(null); flash(`Stopped watching ${symbol}. Slot freed.`);
          }} />
      )}
      {sheet?.kind === 'detail' && (
        <AlertDetailSheet notif={sheet.notif} stock={stocks[sheet.notif.symbol]} onClose={() => setSheet(null)}
          onView={() => {
            const e = sheet.notif.event;
            openStock(sheet.notif.symbol, e.type === 'bundle' ? e.parts[0].date : e.date);
          }} />
      )}
      <PushBanner notif={banner} onTap={() => banner && openNotif(banner)} onDismiss={() => setBanner(null)} />
      <Toast toast={toast} />
    </div>
  );

  const panel = (
    <DemoPanel stocks={stocks} watches={st.watches} target={target} setTarget={setTarget} pushOn={st.pushOn}
      onFire={(t) => fire(t)} onEdge={edge} onReset={reset} />
  );

  return (
    <div className="min-h-full w-full flex justify-center gap-10 sm:py-8">
      <div className="h-[100dvh] sm:h-auto w-full sm:w-auto">{phone}</div>
      <aside className="hidden lg:block w-[340px] shrink-0 rounded-3xl bg-[#121219] p-5 ring-1 ring-white/5 self-start max-h-[844px] overflow-y-auto no-scrollbar">{panel}</aside>
      {demoOpen && (
        <div className="lg:hidden fixed inset-0 z-[100] bg-black/80 p-4 overflow-y-auto" onClick={() => setDemoOpen(false)}>
          <div className="rounded-3xl bg-[#121219] p-5" onClick={(e) => e.stopPropagation()}>
            <DemoPanel stocks={stocks} watches={st.watches} target={target} setTarget={setTarget} pushOn={st.pushOn}
              onFire={(t) => { fire(t); setDemoOpen(false); }} onEdge={(k) => { edge(k); setDemoOpen(false); }} onReset={() => { reset(); setDemoOpen(false); }}
              onClose={() => setDemoOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
