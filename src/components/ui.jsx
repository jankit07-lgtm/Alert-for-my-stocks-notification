import { Bell, Bike, Target, ChartColumnIncreasing, SearchCheck, Settings, Bot, X } from 'lucide-react';

export const Card = ({ className = '', children, ...p }) => (
  <section className={`mx-4 rounded-2xl bg-stonks-surface p-4 ${className}`} {...p}>{children}</section>
);

export const Tile = ({ label, value, sub, badge, onClick, tone }) => (
  <button onClick={onClick} disabled={!onClick}
    className={`text-left rounded-xl bg-stonks-surface3 p-3 min-h-[78px] ${onClick ? 'active:opacity-80 ring-1 ring-transparent hover:ring-stonks-divider' : ''}`}>
    <div className="flex items-center gap-1.5 text-[13px] text-stonks-muted">
      {label}{badge && <span className="rounded bg-stonks-brand/20 px-1 text-[9px] font-bold text-stonks-brand">{badge}</span>}
    </div>
    <div className={`mt-1.5 text-[17px] font-semibold leading-tight ${tone || ''}`}>{value}</div>
    {sub && <div className="mt-0.5 text-[11px] text-stonks-muted leading-tight">{sub}</div>}
  </button>
);

export const Pill = ({ children, kind = 'brand', className = '' }) => {
  const k = {
    brand: 'bg-stonks-brand/15 text-stonks-brand',
    loss: 'bg-stonks-loss/15 text-stonks-loss',
    muted: 'bg-stonks-neutral text-stonks-muted',
    info: 'bg-stonks-infoBg text-stonks-info',
    amber: 'bg-stonks-amber/15 text-stonks-amber',
  }[kind];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${k} ${className}`}>{children}</span>;
};

export function Logo({ size = 40 }) {
  return (
    <div style={{ width: size, height: size }} className="rounded-full bg-[#0f5a32] grid place-items-center shadow-inner">
      <svg viewBox="0 0 32 32" width={size * 0.62} height={size * 0.62} fill="none">
        <path d="M4 22l6-7 4 4 7-9 3 3 4-6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 7h4v4" stroke="#4FE682" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function TopBar({ unread, onBell, bellActive }) {
  return (
    <div className="flex items-center justify-between px-4 h-16 shrink-0">
      <Logo />
      <div className="flex items-center gap-6">
        <Bike className="h-7 w-7" strokeWidth={1.75} />
        <button onClick={onBell} aria-label="Notifications" className={`relative rounded-full p-1 ${bellActive ? 'bg-stonks-surface2' : ''}`}>
          <Bell className="h-7 w-7" strokeWidth={1.75} />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-stonks-brand text-[11px] font-bold grid place-items-center">{unread > 99 ? '99+' : unread}</span>
          )}
        </button>
      </div>
    </div>
  );
}

const TABS = [
  ['Plan', Target],
  ['Stocks', ChartColumnIncreasing],
  ['Trades', SearchCheck],
  ['Settings', Settings],
];
export function BottomNav() {
  return (
    <nav className="absolute bottom-0 inset-x-0 h-[76px] grid grid-cols-4 bg-stonks-nav pb-3 z-20">
      {TABS.map(([label, Icon]) => {
        const on = label === 'Stocks';
        return (
          <div key={label} className={`flex flex-col items-center justify-center gap-1 text-[13px] ${on ? 'text-stonks-brand' : 'text-stonks-muted'}`}>
            <Icon className="h-6 w-6" strokeWidth={1.75} />
            <span>{label}</span>
            {on && <span className="h-0.5 w-10 rounded-full bg-stonks-brand" />}
          </div>
        );
      })}
    </nav>
  );
}

export const SaiButton = () => (
  <div className="absolute right-3 bottom-[92px] z-20 h-14 w-14 rounded-full bg-stonks-brand grid place-items-center ring-4 ring-black/60 shadow-lg" title="Sai">
    <Bot className="h-7 w-7" />
  </div>
);

export function Sheet({ title, onClose, children, footer }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 animate-fade" onClick={onClose} />
      <div className="relative max-h-[88%] flex flex-col rounded-t-3xl bg-stonks-surface animate-up">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-stonks-chip" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-full bg-stonks-surface2" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto no-scrollbar px-5 pb-4">{children}</div>
        {footer && <div className="px-5 pb-6 pt-2 border-t border-stonks-divider">{footer}</div>}
      </div>
    </div>
  );
}

export const PrimaryButton = ({ children, className = '', disabled, ...p }) => (
  <button disabled={disabled} {...p}
    className={`h-12 w-full rounded-full font-semibold ${disabled ? 'bg-stonks-chip text-stonks-muted' : 'bg-stonks-brand active:opacity-90'} ${className}`}>{children}</button>
);

export const GhostButton = ({ children, className = '', ...p }) => (
  <button {...p} className={`h-12 w-full rounded-full font-semibold border border-stonks-divider text-white active:opacity-80 ${className}`}>{children}</button>
);

export function TickerIcon({ stock, size = 44 }) {
  return (
    <div style={{ width: size, height: size, background: stock.color }}
      className="rounded-full grid place-items-center text-[13px] font-bold text-white shrink-0">
      {stock.symbol.slice(0, 2)}
    </div>
  );
}

export function Gauge({ value, label, caption, threshold = 60 }) {
  const v = value ?? 0;
  const r = 52, cx = 64, cy = 62;
  const pt = (pct) => {
    const a = Math.PI * (1 - pct);
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
  const arc = (from, to) => {
    const [x1, y1] = pt(from), [x2, y2] = pt(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 0.5 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  const color = value == null ? '#3F3F50' : v >= 50 ? '#4FE682' : '#FFC21A';
  const [tx1, ty1] = pt(threshold / 100);
  const [tx2, ty2] = [cx + (r + 9) * Math.cos(Math.PI * (1 - threshold / 100)), cy - (r + 9) * Math.sin(Math.PI * (1 - threshold / 100))];
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 128 76" className="w-[124px]">
        <path d={arc(0.0001, 0.9999)} stroke="#3B3F55" strokeWidth="11" fill="none" strokeLinecap="round" />
        {value != null && <path d={arc(0.0001, Math.max(0.01, v / 100))} stroke={color} strokeWidth="11" fill="none" strokeLinecap="round" />}
        <line x1={tx1} y1={ty1} x2={tx2} y2={ty2} stroke="#FFFFFF" strokeOpacity=".55" strokeWidth="1.5" />
        <text x="64" y="54" textAnchor="middle" fontSize="26" fontWeight="700" fill={value == null ? '#5A5A6B' : color}>{value ?? '—'}</text>
        <text x="64" y="71" textAnchor="middle" fontSize="11" fontWeight="600" fill="#fff">{label}</text>
      </svg>
      <div className="text-[11px] text-stonks-muted text-center leading-tight mt-0.5 px-1">{caption}</div>
    </div>
  );
}

export function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className="absolute left-4 right-4 bottom-[96px] z-50 animate-up">
      <div className={`rounded-2xl px-4 py-3 text-[14px] shadow-xl ${toast.kind === 'warn' ? 'bg-[#3a2f12] text-stonks-amber' : 'bg-stonks-surface2 text-white'} ring-1 ring-stonks-divider`}>
        {toast.text}
      </div>
    </div>
  );
}
