import { useState } from 'react';
import { ArrowLeft, BellOff, TrendingUp, TrendingDown, CalendarCheck, Gauge as GaugeIcon, Layers, Info, ChevronRight } from 'lucide-react';
import { Pill, TickerIcon, Logo } from './ui';
import { TIER, CONDITIONS, timeAgo, money } from '../lib/alerts';

const ICON = {
  support: [TrendingUp, 'text-stonks-gauge bg-stonks-gauge/15'],
  resistance: [TrendingDown, 'text-stonks-loss bg-stonks-loss/15'],
  plan: [CalendarCheck, 'text-stonks-info bg-stonks-info/15'],
  scores: [GaugeIcon, 'text-stonks-amber bg-stonks-amber/15'],
  bundle: [Layers, 'text-stonks-brand bg-stonks-brand/15'],
  system: [Info, 'text-stonks-muted bg-stonks-neutral'],
};

export function NotificationCenter({ notifs, stocks, watches, now, pushOn, onEnablePush, onOpen, onBack, onOpenStock, onMarkAll, onEdit }) {
  const [tab, setTab] = useState('all');
  const watchList = Object.entries(watches);
  const sorted = [...notifs].sort((a, b) => b.ts - a.ts);
  return (
    <div className="absolute inset-0 top-[44px] z-30 flex flex-col bg-stonks-bg animate-fade">
      <div className="flex items-center gap-3 px-4 h-14 shrink-0">
        <button onClick={onBack} aria-label="Back" className="h-9 w-9 grid place-items-center rounded-full bg-stonks-surface"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-[20px] font-semibold flex-1">Notifications</h1>
        {tab === 'all' && <button onClick={onMarkAll} className="text-[13px] text-stonks-brand font-semibold">Mark all read</button>}
      </div>
      <div className="mx-4 flex rounded-[10px] bg-stonks-segment p-1 shrink-0">
        {[['all', 'All'], ['mine', `My Alerts ${watchList.length}/${TIER.limit}`]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`flex-1 h-9 rounded-lg text-[14px] ${tab === k ? 'bg-stonks-brand font-semibold' : 'text-[#C8C8C8]'}`}>{l}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-3 pb-28 space-y-2">
        {tab === 'all' && (
          <>
            {!pushOn && (
              <div className="rounded-2xl bg-[#3a2f12] p-3 flex items-start gap-3">
                <BellOff className="h-5 w-5 text-stonks-amber mt-0.5" />
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-stonks-amber">Push notifications are off</div>
                  <div className="text-[12px] text-[#e6cf8f]">Alerts still arrive here, but you won't be notified on your phone.</div>
                  <button onClick={onEnablePush} className="mt-2 rounded-full bg-stonks-amber px-3 py-1 text-[12px] font-semibold text-black">Turn on</button>
                </div>
              </div>
            )}
            {sorted.length === 0 && <div className="mt-10 text-center text-stonks-muted">No alerts yet. Watch a stock from its Stocks page.</div>}
            {sorted.map((n) => {
              const [Icon, cls] = ICON[n.type];
              return (
                <button key={n.id} onClick={() => onOpen(n)}
                  className={`w-full text-left rounded-2xl p-3 flex gap-3 ${n.read ? 'bg-stonks-surface' : 'bg-stonks-surface2 ring-1 ring-stonks-brandBorder'}`}>
                  <div className={`h-10 w-10 shrink-0 rounded-xl grid place-items-center ${cls}`}><Icon className="h-5 w-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold flex-1 leading-snug">{n.title}</span>
                      {!n.read && <span className="h-2 w-2 rounded-full bg-stonks-brand shrink-0" />}
                    </div>
                    <div className="mt-0.5 text-[12px] text-stonks-muted line-clamp-2">{n.body}</div>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-stonks-dim">
                      <span>{timeAgo(n.ts, now)}</span>
                      {n.delivered === 'inapp' && <span>· in-app only</span>}
                      {n.simulated && <Pill kind="muted" className="!text-[9px] !px-1.5">demo</Pill>}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
        {tab === 'mine' && (
          <>
            <div className="text-[12px] text-stonks-muted px-1">{TIER.name} plan · {TIER.limit - watchList.length} slots free</div>
            {watchList.map(([sym, w]) => {
              const s = stocks[sym];
              if (!s) return null;
              const on = CONDITIONS.filter((c) => w.conditions[c.key] && !(c.universeOnly && !s.universe));
              return (
                <div key={sym} className="rounded-2xl bg-stonks-surface p-3">
                  <button onClick={() => onOpenStock(sym)} className="w-full flex items-center gap-3 text-left">
                    <TickerIcon stock={s} size={38} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-2">{sym}<span className="text-[13px] font-normal text-stonks-muted">{money(s.price)}</span></div>
                      <div className="text-[12px] text-stonks-muted truncate">{on.map((c) => c.short).join(' · ') || 'All conditions off'}</div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-stonks-muted" />
                  </button>
                  {(w.pausedReason || !s.universe) && (
                    <div className="mt-2 rounded-lg bg-stonks-neutral px-2.5 py-1.5 text-[12px] text-stonks-muted">
                      {w.pausedReason || 'Plan and score alerts unavailable · not in Universe'}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button onClick={() => onEdit(sym)} className="flex-1 h-9 rounded-full bg-stonks-surface2 text-[13px] font-semibold">Edit</button>
                  </div>
                </div>
              );
            })}
            {watchList.length === 0 && <div className="mt-10 text-center text-stonks-muted">You're not watching any stocks.</div>}
          </>
        )}
      </div>
    </div>
  );
}

// Lock-screen style push banner inside the phone.
export function PushBanner({ notif, onTap, onDismiss }) {
  if (!notif) return null;
  return (
    <div className="absolute left-2 right-2 top-1.5 z-[60] animate-drop">
      <button onClick={onTap} className="w-full text-left rounded-[22px] bg-[#2b2b38]/95 backdrop-blur px-3.5 py-3 shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center gap-2 text-[12px] text-[#c9c9d6]">
          <Logo size={20} /> <span className="font-semibold tracking-wide">STONKSAI</span><span className="ml-auto">now</span>
        </div>
        <div className="mt-1.5 text-[14px] font-semibold leading-snug">{notif.title}</div>
        <div className="text-[13px] text-[#d4d4de] line-clamp-2 leading-snug">{notif.body}</div>
      </button>
      <button onClick={onDismiss} className="mx-auto mt-1 block h-1 w-10 rounded-full bg-white/30" aria-label="Dismiss" />
    </div>
  );
}
