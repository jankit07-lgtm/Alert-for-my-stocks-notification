import { useState } from 'react';
import { Lock, Check, Search, ChevronRight } from 'lucide-react';
import { Sheet, PrimaryButton, GhostButton, Pill, TickerIcon } from './ui';
import { CONDITIONS, TIER, money, liveStatus, zoneText, fmtDate, condByKey, buildNotification } from '../lib/alerts';

function Toggle({ on, disabled, onChange }) {
  return (
    <button disabled={disabled} onClick={() => onChange(!on)} aria-pressed={on}
      className={`relative h-7 w-12 rounded-full transition ${disabled ? 'bg-stonks-neutral' : on ? 'bg-stonks-brand' : 'bg-stonks-chip'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${on && !disabled ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

// Create or edit the alert for one stock.
export function AlertSheet({ stock, watch, watchCount, limit, onSave, onRemove, onClose, onUpgradeReplace }) {
  const editing = !!watch;
  const [conds, setConds] = useState(
    watch?.conditions || Object.fromEntries(CONDITIONS.map((c) => [c.key, !(c.universeOnly && !stock.universe)])),
  );
  const status = liveStatus(stock);
  const full = !editing && watchCount >= limit;
  const anyOn = Object.entries(conds).some(([k, v]) => v && !(condByKey[k].universeOnly && !stock.universe));

  if (full) {
    return (
      <Sheet title="All alert slots in use" onClose={onClose}
        footer={<div className="space-y-2"><PrimaryButton onClick={onUpgradeReplace}>Replace an existing alert</PrimaryButton><GhostButton onClick={onClose}>Not now</GhostButton></div>}>
        <p className="text-[15px] text-stonks-muted">
          You're using {watchCount} of {limit} alert slots on {TIER.name}. Remove one to watch {stock.symbol}.
        </p>
        <p className="mt-3 text-[13px] text-stonks-dim">On Pro this screen would offer an upgrade to Ultra instead.</p>
      </Sheet>
    );
  }

  return (
    <Sheet title={editing ? `Edit alert · ${stock.symbol}` : `Alert me about ${stock.symbol}`} onClose={onClose}
      footer={
        <div className="space-y-2">
          <PrimaryButton disabled={!anyOn} onClick={() => onSave(conds)}>{editing ? 'Save changes' : `Start watching ${stock.symbol}`}</PrimaryButton>
          {editing && <GhostButton className="text-stonks-loss border-stonks-loss/40" onClick={onRemove}>Stop watching · frees 1 slot</GhostButton>}
        </div>
      }>
      <div className="flex items-center gap-3 rounded-xl bg-stonks-surface2 p-3">
        <TickerIcon stock={stock} size={36} />
        <div className="flex-1">
          <div className="font-semibold">{stock.symbol} · {money(stock.price)}</div>
          <div className="text-[12px] text-stonks-muted">
            {TIER.name} plan · {editing ? watchCount : watchCount + 1} of {limit} slots {editing ? 'used' : 'after this'}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[13px] text-stonks-muted">We'll send a push notification when any condition you turn on is met. All are on by default.</p>
      <div className="mt-3 space-y-2.5">
        {CONDITIONS.map((c) => {
          const locked = c.universeOnly && !stock.universe;
          const now = status[c.key];
          return (
            <div key={c.key} className={`rounded-xl bg-stonks-surface2 p-3 ${locked ? 'opacity-60' : ''}`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-[15px] font-semibold flex items-center gap-1.5">{locked && <Lock className="h-3.5 w-3.5" />}{c.title}</div>
                  <div className="text-[12px] text-stonks-muted mt-0.5">{c.desc}</div>
                  {c.key === 'support' && !locked && <div className="text-[12px] mt-1 text-stonks-gauge">Zone {stock.levels.support ? zoneText(stock.levels.support) : 'none nearby — paused until one forms'}</div>}
                  {c.key === 'resistance' && !locked && <div className="text-[12px] mt-1 text-stonks-loss">{stock.levels.resistance ? `Zone ${zoneText(stock.levels.resistance)}` : <span className="text-stonks-highlight">Price discovery — paused until a level forms</span>}</div>}
                  {locked && <div className="text-[12px] mt-1 text-stonks-amber">Available only for stocks in the StonksAI Universe</div>}
                  {now && !locked && <div className="mt-1.5 inline-flex rounded-md bg-stonks-amber/15 px-2 py-0.5 text-[12px] text-stonks-amber">Right now: {now}</div>}
                </div>
                <Toggle on={conds[c.key] && !locked} disabled={locked} onChange={(v) => setConds((p) => ({ ...p, [c.key]: v }))} />
              </div>
            </div>
          );
        })}
      </div>
      {!editing && (status.plan || status.scores || status.support || status.resistance) && (
        <p className="mt-3 text-[12px] text-stonks-muted">Conditions that are already true are shown here, not sent as a push. You'll be alerted the next time they become true.</p>
      )}
      <p className="mt-3 text-[11px] text-stonks-dim">Alerts describe market conditions and are not a recommendation to buy or sell.</p>
    </Sheet>
  );
}

export function SearchSheet({ stocks, current, watches, onPick, onClose }) {
  const [q, setQ] = useState('');
  const list = stocks.filter((s) => (s.symbol + s.name).toLowerCase().includes(q.toLowerCase()));
  return (
    <Sheet title="Search stocks" onClose={onClose}>
      <div className="flex items-center gap-2 h-11 rounded-xl border border-stonks-field bg-stonks-surface3 px-3">
        <Search className="h-4 w-4 text-stonks-muted" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ticker or company" className="flex-1 bg-transparent outline-none text-[15px]" />
      </div>
      <div className="mt-3 space-y-2">
        {list.map((s) => (
          <button key={s.symbol} onClick={() => onPick(s.symbol)}
            className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left ${s.symbol === current ? 'bg-stonks-brand/10 ring-1 ring-stonks-brandBorder' : 'bg-stonks-surface2'}`}>
            <TickerIcon stock={s} size={36} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold flex items-center gap-2">{s.symbol}{watches[s.symbol] && <Pill>Watching</Pill>}</div>
              <div className="text-[12px] text-stonks-muted truncate">{s.name}</div>
            </div>
            {!s.universe && <Pill kind="muted">Not in Universe</Pill>}
            <ChevronRight className="h-4 w-4 text-stonks-muted" />
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-stonks-dim">Prototype includes 5 tickers. SOFI is treated as outside the Universe to show that edge case.</p>
    </Sheet>
  );
}

export function LevelsInfoSheet({ stock, onClose }) {
  const lv = stock.levels;
  const lg = stock.legacy;
  return (
    <Sheet title="Support & resistance" onClose={onClose}>
      <p className="text-[14px] text-stonks-muted">
        Levels come from price points where {stock.symbol} actually turned over the last {lv.bars_used} trading days. Nearby turning points are grouped into a zone and scored by touches, recency, reaction size and volume.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {['support', 'resistance'].map((k) => {
          const z = lv[k];
          return (
            <div key={k} className="rounded-xl bg-stonks-surface3 p-3">
              <div className={`text-[12px] font-semibold uppercase ${k === 'support' ? 'text-stonks-gauge' : 'text-stonks-loss'}`}>{k}</div>
              {z ? (
                <>
                  <div className="mt-1 text-[15px] font-semibold">{zoneText(z)}</div>
                  <div className="mt-1 text-[12px] text-stonks-muted leading-snug">
                    Strength {z.strength}/100<br />{z.touches} touches · last {fmtDate(z.last_touch)}<br />
                    {z.dist_pct > 0 ? '+' : ''}{z.dist_pct.toFixed(1)}% · {Math.abs(z.dist_atr).toFixed(1)} ATR away
                  </div>
                </>
              ) : (
                <div className="mt-1 text-[13px] text-stonks-highlight">{k === 'resistance' ? 'Price discovery: no level above' : 'No nearby support'}</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-xl border border-stonks-divider p-3">
        <div className="text-[13px] font-semibold">Compared with today's method</div>
        <div className="mt-1 text-[13px] text-stonks-muted">
          The live app shows <span className="text-white">Support {money(lg.support)}</span> (= SMA 200) and <span className="text-white">Resistance {money(lg.resistance)}</span> (= 52-week high).
          {lg.support < stock.price && ` Today's support is ${(((stock.price - lg.support) / stock.price) * 100).toFixed(1)}% below the price, so a support alert would rarely fire.`}
        </div>
      </div>
      <div className="mt-3 text-[11px] text-stonks-dim">Method {lv.params} · ATR(14) {money(stock.technicals.atr)} · recalculated daily after the close.</div>
    </Sheet>
  );
}

export function AlertDetailSheet({ notif, stock, onView, onClose }) {
  const e = notif.event;
  const parts = e.type === 'bundle' ? e.parts : [e];
  return (
    <Sheet title={notif.symbol} onClose={onClose}
      footer={<PrimaryButton onClick={onView}>View {notif.symbol} on the Stocks page</PrimaryButton>}>
      <div className="text-[16px] font-semibold">{notif.title}</div>
      <div className="mt-1 text-[12px] text-stonks-muted">{new Date(notif.ts).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/New_York' })} ET{notif.simulated ? ' · demo' : ''}</div>
      <div className="mt-3 space-y-2.5">
        {parts.map((p, i) => {
          const n = buildNotification(stock, p);
          return (
            <div key={i} className="rounded-xl bg-stonks-surface2 p-3">
              <div className="text-[12px] font-semibold uppercase text-stonks-muted">{condByKey[p.type].title}</div>
              <div className="mt-1 text-[14px]">{n.body}</div>
              {p.divergence && (
                <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                  <div className="rounded-lg bg-stonks-surface3 p-2">
                    <div className="text-stonks-muted">Earlier {p.type === 'support' ? 'low' : 'high'} · {fmtDate(p.divergence.prior_date)}</div>
                    <div className="font-semibold">{money(p.divergence.prior_price)} · RSI {p.divergence.prior_rsi}</div>
                  </div>
                  <div className="rounded-lg bg-stonks-surface3 p-2">
                    <div className="text-stonks-muted">This {p.type === 'support' ? 'low' : 'high'} · {fmtDate(p.date)}</div>
                    <div className="font-semibold">{money(p.divergence.cur_price)} · RSI {p.divergence.cur_rsi}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] text-stonks-dim">This alert describes market conditions. It is not a recommendation to buy or sell. Next alert for the same condition waits until price moves more than 1 ATR away from the level.</p>
    </Sheet>
  );
}
