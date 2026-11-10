import { Search, BellPlus, BellRing, ChevronRight, Info, Lock } from 'lucide-react';
import PriceChart from './PriceChart';
import { Card, Tile, Pill, Gauge, TickerIcon } from './ui';
import { CONDITIONS, money, signed, fmtDate, currentWeek, liveStatus, TIER } from '../lib/alerts';

export default function StockScreen({ stock, watch, watchCount, onSearch, onAlert, onManage, onLevelsInfo, focusDate, lastFired }) {
  const up = stock.change >= 0;
  const t = stock.technicals;
  const lv = stock.levels;
  const w = currentWeek(stock);
  const status = liveStatus(stock);

  return (
    <div className="space-y-4 pb-28">
      {/* Header card */}
      <Card className="p-5">
        <div className="flex items-center gap-3">
          <TickerIcon stock={stock} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="text-[26px] font-bold leading-none">{stock.symbol}</div>
              {!stock.universe && <Pill kind="muted">Not in Universe</Pill>}
            </div>
            <div className="text-[15px] text-stonks-muted truncate mt-1">{stock.name}</div>
          </div>
          <button onClick={onSearch} aria-label="Search" className="h-10 w-10 grid place-items-center"><Search className="h-6 w-6" /></button>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-[30px] font-bold">{money(stock.price)}</div>
          <div className={`rounded-full px-3 py-1.5 text-[15px] font-semibold ${up ? 'bg-stonks-brand/15 text-stonks-brand' : 'bg-stonks-loss/15 text-stonks-loss'}`}>
            {up ? '+' : '−'}${Math.abs(stock.change).toFixed(2)} ({signed(stock.changePct)}%)
          </div>
        </div>
        <div className="mt-1 text-[11px] text-stonks-dim">Close {fmtDate(stock.asOf, { month: 'short', day: 'numeric', year: 'numeric' })} · Polygon</div>

        {/* NEW: alert entry point */}
        <button onClick={watch ? onManage : onAlert}
          className={`mt-4 w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left ${watch ? 'bg-stonks-brand/15 ring-1 ring-stonks-brandBorder' : 'bg-stonks-surface2'}`}>
          {watch ? <BellRing className="h-5 w-5 text-stonks-brand" /> : <BellPlus className="h-5 w-5" />}
          <div className="flex-1">
            <div className={`text-[15px] font-semibold ${watch ? 'text-stonks-brand' : ''}`}>
              {watch ? `Watching ${stock.symbol}` : `Alert me about ${stock.symbol}`}
            </div>
            <div className="text-[12px] text-stonks-muted">
              {watch
                ? `${Object.values(watch.conditions).filter(Boolean).length} conditions on · tap to edit`
                : `${TIER.name} · ${watchCount} of ${TIER.limit} alert slots used`}
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-stonks-muted" />
        </button>
      </Card>

      {/* Chart */}
      <Card>
        <PriceChart stock={stock} focusDate={focusDate} showMarkers={!!watch} />
      </Card>

      {/* NEW: alert status card */}
      {watch && (
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-semibold">Alert for My Stock</h2>
            <button onClick={onManage} className="text-[13px] text-stonks-brand font-semibold">Edit</button>
          </div>
          <div className="mt-3 space-y-2">
            {CONDITIONS.map((c) => {
              const locked = c.universeOnly && !stock.universe;
              const on = watch.conditions[c.key];
              const now = status[c.key];
              const fired = lastFired[c.key];
              return (
                <div key={c.key} className={`flex items-center gap-3 rounded-xl bg-stonks-surface2 px-3 py-2.5 ${locked || !on ? 'opacity-55' : ''}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${locked || !on ? 'bg-stonks-dim' : now ? 'bg-stonks-amber' : 'bg-stonks-brand'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold">{c.short}</div>
                    <div className="text-[12px] text-stonks-muted truncate">
                      {locked ? 'Only for stocks in our Universe' : !on ? 'Off' : now ? now : fired ? `Last alert ${fmtDate(fired)}` : 'Monitoring'}
                    </div>
                  </div>
                  {locked ? <Lock className="h-4 w-4 text-stonks-dim" /> : on && <Pill kind={now ? 'amber' : 'brand'}>{now ? 'Live' : 'On'}</Pill>}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-stonks-muted">
            Price conditions are checked every 15 min in market hours (9:30–4:00 ET). Plan and score conditions are checked when the weekly refresh publishes.
          </div>
        </Card>
      )}

      {/* Weekly scores */}
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-[20px] font-semibold">Weekly Scores</h2>
          {stock.universe && w.scores && Math.min(...w.scores) >= 60 && <Pill kind="amber">All 4 ≥ 60</Pill>}
        </div>
        {stock.universe ? (
          <>
            <div className="mt-3 grid grid-cols-2 gap-y-4">
              <Gauge value={w.scores[0]} label="FQS" caption="Fundamental Quality" />
              <Gauge value={w.scores[1]} label="TMS" caption="Technical Momentum" />
              <Gauge value={w.scores[2]} label="DVES" caption="Derivative Volatility Edge" />
              <Gauge value={w.scores[3]} label="SMAS" caption="Sentiment & Macro" />
            </div>
            <div className="mt-3 text-[12px] text-stonks-muted">Tick mark on each gauge = the 60 alert threshold. Scores refresh weekly and discount breaking news.</div>
            {w.in_plan && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-stonks-infoBg/40 px-3 py-2 text-[13px] text-stonks-info">
                <Info className="h-4 w-4" /> In this week's StonksAI plan (week of {fmtDate(w.week)})
              </div>
            )}
          </>
        ) : (
          <div className="mt-3 rounded-xl bg-stonks-surface2 p-4 text-[14px] text-stonks-muted">
            {stock.symbol} isn't in the StonksAI Universe yet, so weekly scores and plan picks aren't available. Price alerts still work.
          </div>
        )}
        <div className="mt-2 text-[10px] text-stonks-dim">Prototype: scores and plan picks are mock data; prices are real.</div>
      </Card>

      {/* Technical analysis */}
      <Card>
        <h2 className="text-[20px] font-semibold">Technical Analysis 🚀</h2>
        <div className="mt-3 grid grid-cols-3 gap-2.5">
          <Tile label="Daily RSI" value={t.rsi.toFixed(2)} />
          <Tile label="MACD" value={t.macd.toFixed(2)} />
          <Tile label="SMA 50" value={money(t.sma50)} />
          <Tile label="SMA 200" value={t.sma200 ? money(t.sma200) : '—'} sub={!t.sma200 ? 'Not enough history' : null} />
          <Tile label="Ind. Support" badge="NEW" onClick={onLevelsInfo} tone="text-stonks-gauge"
            value={lv.support ? `${money(lv.support.low)}` : 'None nearby'}
            sub={lv.support ? `to ${money(lv.support.high)} · str ${lv.support.strength}` : 'Price at new lows'} />
          <Tile label="Ind. Resistance" badge="NEW" onClick={onLevelsInfo} tone={lv.resistance ? 'text-stonks-loss' : 'text-stonks-highlight'}
            value={lv.resistance ? `${money(lv.resistance.low)}` : 'Price discovery'}
            sub={lv.resistance ? `to ${money(lv.resistance.high)} · str ${lv.resistance.strength}` : 'No level above'} />
          <Tile label="52 Week High" value={money(t.hi52)} />
          <Tile label="52 Week Low" value={money(t.lo52)} />
          <Tile label="Trend" value={t.trend} tone={t.trend === 'Bullish' ? 'text-stonks-brand' : 'text-stonks-loss'} />
        </div>
        <button onClick={onLevelsInfo} className="mt-3 flex items-center gap-1.5 text-[13px] text-stonks-brand font-semibold">
          <Info className="h-4 w-4" /> How support & resistance are calculated
        </button>
      </Card>

      <Card className="text-[13px] text-stonks-muted">
        Fundamental Analysis and Recent News sections are unchanged by this feature and left out of the prototype.
      </Card>
    </div>
  );
}
