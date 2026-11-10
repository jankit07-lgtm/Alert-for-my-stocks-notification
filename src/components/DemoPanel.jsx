import { TrendingUp, TrendingDown, CalendarCheck, Gauge, Layers, RotateCcw, BellOff, Bell, Repeat, LogOut, Inbox, EyeOff, Ban } from 'lucide-react';

const Btn = ({ icon: Icon, children, onClick, tone = '' }) => (
  <button onClick={onClick} className={`w-full flex items-center gap-2.5 rounded-xl bg-[#1b1b2b] hover:bg-[#232338] px-3 py-2.5 text-left text-[13px] ring-1 ring-white/5 ${tone}`}>
    <Icon className="h-4 w-4 shrink-0" /> <span className="flex-1">{children}</span>
  </button>
);

export default function DemoPanel({ stocks, watches, target, setTarget, pushOn, onFire, onEdge, onReset, onClose }) {
  const watched = Object.keys(watches).filter((s) => stocks[s]);
  return (
    <div className="space-y-5 text-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] font-bold tracking-widest text-stonks-brand">DEMO CONTROLS</div>
          <h2 className="text-[20px] font-semibold leading-tight mt-1">Alert for My Stock</h2>
          <p className="text-[12px] text-stonks-muted mt-1">Ultra user · real Polygon prices to Nov 9, 2026 · mock scores and plan picks</p>
        </div>
        {onClose && <button onClick={onClose} className="rounded-full bg-[#1b1b2b] px-3 py-1 text-[12px]">Close</button>}
      </div>

      <section>
        <h3 className="text-[13px] font-semibold text-stonks-muted mb-2">Happy path</h3>
        <ol className="space-y-1.5 text-[13px] text-[#d0d0dc] list-decimal pl-5">
          <li>Tap 🔍 on the Stocks page and pick <b>MU</b>.</li>
          <li>Tap <b>Alert me about MU</b>, review the conditions, start watching.</li>
          <li>Fire an alert below. A push banner drops in.</li>
          <li>Tap the banner → detail → <b>View on the Stocks page</b>.</li>
          <li>Tap the bell to see all alerts and <b>My Alerts</b>.</li>
        </ol>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold text-stonks-muted mb-2">Fire an alert for</h3>
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {Object.values(stocks).map((s) => (
            <button key={s.symbol} onClick={() => setTarget(s.symbol)}
              className={`rounded-full px-3 py-1 text-[12px] font-semibold ${target === s.symbol ? 'bg-stonks-brand' : 'bg-[#1b1b2b] text-stonks-muted'}`}>
              {s.symbol}{watched.includes(s.symbol) ? ' ●' : ''}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Btn icon={TrendingUp} onClick={() => onFire('support')}>1 · At support + bullish divergence</Btn>
          <Btn icon={TrendingDown} onClick={() => onFire('resistance')}>2 · At resistance + bearish divergence</Btn>
          <Btn icon={CalendarCheck} onClick={() => onFire('plan')}>3 · Picked in this week's plan</Btn>
          <Btn icon={Gauge} onClick={() => onFire('scores')}>4 · All four scores reach 60+</Btn>
          <Btn icon={Layers} onClick={() => onFire('bundle')}>Several conditions at once (bundled)</Btn>
        </div>
        <p className="mt-2 text-[11px] text-stonks-dim">● = watched. Price alerts replay the stock's most recent real trigger from the backtest when one exists.</p>
      </section>

      <section>
        <h3 className="text-[13px] font-semibold text-stonks-muted mb-2">Edge cases</h3>
        <div className="space-y-1.5">
          <Btn icon={pushOn ? BellOff : Bell} onClick={() => onEdge('push')}>{pushOn ? 'Turn push permission off' : 'Turn push permission back on'}</Btn>
          <Btn icon={Repeat} onClick={() => onEdge('cooldown')}>Fire the same price alert twice (cooldown)</Btn>
          <Btn icon={EyeOff} onClick={() => onEdge('unwatched')}>Condition met on a stock you don't watch</Btn>
          <Btn icon={LogOut} onClick={() => onEdge('universe')}>Selected stock leaves the Universe</Btn>
          <Btn icon={Inbox} onClick={() => onEdge('slots')}>Fill all {20} alert slots</Btn>
          <Btn icon={Ban} onClick={() => onEdge('delist')}>A watched ticker is delisted</Btn>
          <Btn icon={RotateCcw} onClick={onReset} tone="text-stonks-amber">Reset demo</Btn>
        </div>
      </section>

      <section className="text-[11px] text-stonks-dim leading-relaxed">
        Not shown, but covered in the spec: gaps through a level, stale data skips, split-adjustment days, market-hours-only checks, and downgrade handling.
      </section>
    </div>
  );
}
