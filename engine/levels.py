"""
Swing-based support/resistance zones + RSI divergence + alert replay.
Implements the spec agreed in chat (swing_v1). Run:  python levels.py <raw_dir> <out_dir>
"""
import json, math, sys, datetime as dt
from pathlib import Path
import numpy as np
import pandas as pd

P = dict(k=5, reaction_bars=10, min_reaction_atr=1.5, cluster_tol_atr=0.5,
         max_zone_atr=1.0, half_life=126, min_touches=2, min_strength=40,
         lookback=504, min_bars=120, params_version="swing_v1.0")

META = {
    "MSFT": ("Microsoft Corporation", True, "#00A4EF"),
    "MU":   ("Micron Technology, Inc.", True, "#3E9D6E"),
    "NVDA": ("NVIDIA Corporation", True, "#76B900"),
    "AAPL": ("Apple Inc.", True, "#8F6AB4"),
    "SOFI": ("SoFi Technologies, Inc.", False, "#3F8F9B"),
}

EPOCH = dt.date(1970, 1, 1)


def load(path):
    rows = []
    for rec in Path(path).read_text().strip().split(";"):
        d, o, h, l, c, v = rec.split(",")
        rows.append(dict(date=EPOCH + dt.timedelta(days=int(d) + 20000), o=float(o), h=float(h),
                         l=float(l), c=float(c), v=int(v) * 100000))
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    return df.reset_index(drop=True)


def atr(df, n=14):
    pc = df.c.shift(1)
    tr = pd.concat([df.h - df.l, (df.h - pc).abs(), (df.l - pc).abs()], axis=1).max(axis=1)
    return tr.ewm(alpha=1 / n, adjust=False).mean()


def rsi(c, n=14):
    d = c.diff()
    up = d.clip(lower=0).ewm(alpha=1 / n, adjust=False).mean()
    dn = (-d.clip(upper=0)).ewm(alpha=1 / n, adjust=False).mean()
    return 100 - 100 / (1 + up / dn)


def swings(df, k):
    hi, lo = [], []
    H, L = df.h.values, df.l.values
    for i in range(k, len(df) - k):
        if H[i] > H[i - k:i].max() and H[i] > H[i + 1:i + k + 1].max():
            hi.append(i)
        if L[i] < L[i - k:i].min() and L[i] < L[i + 1:i + k + 1].min():
            lo.append(i)
    return hi, lo


def compute_zones(df, end):
    """Zones using bars [0, end] inclusive only (no look-ahead)."""
    d = df.iloc[max(0, end + 1 - P["lookback"]):end + 1].reset_index(drop=True)
    if len(d) < P["min_bars"]:
        return None
    A = d["atr"].values
    cur_atr = A[-1]
    hi, lo = swings(d, P["k"])
    pts = []
    n = P["reaction_bars"]
    for i in hi:
        seg = d.l.values[i + 1:i + 1 + n]
        if len(seg) == 0: continue
        r = (d.h[i] - seg.min()) / A[i]
        if r >= P["min_reaction_atr"]:
            pts.append(dict(i=i, p=d.h[i], kind="high", react=r, vol=d.v[i]))
    for i in lo:
        seg = d.h.values[i + 1:i + 1 + n]
        if len(seg) == 0: continue
        r = (seg.max() - d.l[i]) / A[i]
        if r >= P["min_reaction_atr"]:
            pts.append(dict(i=i, p=d.l[i], kind="low", react=r, vol=d.v[i]))
    if not pts:
        return dict(zones=[], atr=cur_atr, d=d)
    pts.sort(key=lambda x: x["p"])
    tol = P["cluster_tol_atr"] * cur_atr
    clusters, cur = [], [pts[0]]
    for p in pts[1:]:
        if abs(p["p"] - np.mean([q["p"] for q in cur])) <= tol:
            cur.append(p)
        else:
            clusters.append(cur); cur = [p]
    clusters.append(cur)
    # split overly wide clusters at their largest gap
    out = []
    stack = clusters[:]
    while stack:
        c = stack.pop()
        prices = [q["p"] for q in c]
        if len(c) > 1 and max(prices) - min(prices) > P["max_zone_atr"] * cur_atr:
            gaps = np.diff(prices); g = int(np.argmax(gaps)) + 1
            stack += [c[:g], c[g:]]
        else:
            out.append(c)
    vol50 = d.v.rolling(50, min_periods=10).mean().values
    last = len(d) - 1
    zones = []
    for c in out:
        zl, zh = min(q["p"] for q in c), max(q["p"] for q in c)
        w = np.array([q["vol"] for q in c], dtype=float)
        center = float(np.average([q["p"] for q in c], weights=w))
        # extra non-swing touches: bar pierced zone and closed back out
        pad = 0.1 * cur_atr
        swing_idx = {q["i"] for q in c}
        extra = []
        for i in range(last + 1):
            if i in swing_idx: continue
            if d.l[i] <= zh + pad and d.c[i] > zh + pad and d.l[i] >= zl - cur_atr:
                extra.append(i)
            elif d.h[i] >= zl - pad and d.c[i] < zl - pad and d.h[i] <= zh + cur_atr:
                extra.append(i)
        # de-duplicate extra touches closer than k bars
        ded = []
        for i in extra:
            if all(abs(i - j) > P["k"] for j in list(swing_idx) + ded):
                ded.append(i)
        touch_idx = sorted(list(swing_idx) + ded)
        touches = len(touch_idx)
        recency = sum(math.exp(-(last - i) / P["half_life"]) for i in touch_idx)
        react = float(np.mean([q["react"] for q in c]))
        rv = [d.v[q["i"]] / vol50[q["i"]] for q in c if vol50[q["i"]] == vol50[q["i"]] and vol50[q["i"]]]
        relvol = float(np.mean(rv)) if rv else 1.0
        kinds = {q["kind"] for q in c}
        zones.append(dict(low=zl, high=zh, center=center, touches=touches, recency=recency,
                          reaction=react, relvol=relvol, reversal=len(kinds) == 2,
                          last_touch=d.date[max(touch_idx)].strftime("%Y-%m-%d"),
                          first_touch=d.date[min(touch_idx)].strftime("%Y-%m-%d")))
    zones = [z for z in zones if z["touches"] >= P["min_touches"]]
    if zones:
        def norm(key, cap=None):
            vals = np.array([min(z[key], cap) if cap else z[key] for z in zones], dtype=float)
            lo_, hi_ = vals.min(), vals.max()
            return (vals - lo_) / (hi_ - lo_) if hi_ > lo_ else np.ones_like(vals)
        nt, nr, nx, nv = norm("touches", 6), norm("recency"), norm("reaction"), norm("relvol")
        for j, z in enumerate(zones):
            s = 35 * nt[j] + 25 * nr[j] + 25 * nx[j] + 10 * nv[j] + (5 if z["reversal"] else 0)
            z["strength"] = int(round(s))
    return dict(zones=zones, atr=cur_atr, d=d)


def pick(zres, price):
    q = [z for z in zres["zones"] if z["strength"] >= P["min_strength"]]
    sup = [z for z in q if z["high"] < price]
    res = [z for z in q if z["low"] > price]
    inside = [z for z in q if z["low"] <= price <= z["high"]]
    s = max(sup, key=lambda z: z["high"]) if sup else None
    r = min(res, key=lambda z: z["low"]) if res else None
    state = "between"
    if inside:
        z = inside[0]
        state = "testing_support"
        # came from above -> testing support; from below -> testing resistance
        if zres["d"].c.values[-6] < z["low"]:
            state = "testing_resistance"
        if state == "testing_support": s = z
        else: r = z
    if r is None: state = "price_discovery" if state == "between" else state
    return s, r, state


def divergence(df, t, kind, k=3, lo_bars=10, hi_bars=60):
    """Bullish: low at t-window is <= prior confirmed swing low while RSI is higher.
    Bearish: mirror on highs."""
    win = df.iloc[max(0, t - 2):t + 1]
    if kind == "bull":
        cur_i = int(win.l.idxmin()); cur_p = df.l[cur_i]; cur_r = df.rsi[cur_i]
        best = None
        for j in range(max(k, t - hi_bars), t - lo_bars):
            seg = df.l.values
            if seg[j] < seg[j - k:j].min() and seg[j] < seg[j + 1:j + k + 1].min():
                if cur_p <= seg[j] * 1.005 and cur_r > df.rsi[j] + 5 and df.rsi[j] < 45:
                    best = j
        if best is not None:
            return dict(prior_date=df.date[best].strftime("%Y-%m-%d"), prior_price=round(df.l[best], 2),
                        prior_rsi=round(df.rsi[best], 1), cur_price=round(cur_p, 2), cur_rsi=round(cur_r, 1))
    else:
        cur_i = int(win.h.idxmax()); cur_p = df.h[cur_i]; cur_r = df.rsi[cur_i]
        best = None
        for j in range(max(k, t - hi_bars), t - lo_bars):
            seg = df.h.values
            if seg[j] > seg[j - k:j].max() and seg[j] > seg[j + 1:j + k + 1].max():
                if cur_p >= seg[j] * 0.995 and cur_r < df.rsi[j] - 5 and df.rsi[j] > 55:
                    best = j
        if best is not None:
            return dict(prior_date=df.date[best].strftime("%Y-%m-%d"), prior_price=round(df.h[best], 2),
                        prior_rsi=round(df.rsi[best], 1), cur_price=round(cur_p, 2), cur_rsi=round(cur_r, 1))
    return None


def zone_out(z, price, a):
    if not z: return None
    return dict(low=round(z["low"], 2), high=round(z["high"], 2), center=round(z["center"], 2),
                strength=z["strength"], touches=z["touches"], last_touch=z["last_touch"],
                dist_pct=round((z["center"] - price) / price * 100, 2),
                dist_atr=round((z["center"] - price) / a, 2))


def weekly_mock(sym, dates):
    """Mock engine outputs (scores + weekly plan) — deterministic, scripted to exercise every alert."""
    mondays = sorted({(d - pd.Timedelta(days=d.weekday())).normalize() for d in dates})[-16:]
    base = {"MSFT": (53, 39, 38, 75), "MU": (64, 58, 55, 61), "NVDA": (70, 52, 61, 66),
            "AAPL": (58, 55, 47, 63), "SOFI": (None, None, None, None)}[sym]
    rng = np.random.default_rng(abs(hash(sym)) % 2**32)
    weeks = []
    for i, m in enumerate(mondays):
        if base[0] is None:
            weeks.append(dict(week=m.strftime("%Y-%m-%d"), scores=None, in_plan=False)); continue
        drift = (i - len(mondays) + 1)
        sc = [int(np.clip(b + rng.integers(-6, 7) + (drift if sym == "MSFT" else 0), 5, 95)) for b in base]
        weeks.append(dict(week=m.strftime("%Y-%m-%d"), scores=sc, in_plan=False))
    if base[0] is not None:
        # scripted moments
        if sym == "MU":
            for w in (weeks[-9], weeks[-8]): w["scores"] = [66, 63, 61, 64]   # crosses 60+ (wk -9)
            weeks[-10]["scores"] = [64, 57, 55, 62]
            weeks[-2]["in_plan"] = True
        if sym == "NVDA":
            weeks[-4]["scores"] = [68, 55, 59, 63]
            weeks[-3]["scores"] = [72, 61, 64, 67]                              # crosses 60+ (wk -3)
            weeks[-2]["scores"] = [71, 60, 62, 64]
            weeks[-1]["in_plan"] = True                                         # in this week's plan
        if sym == "MSFT":
            weeks[-1]["scores"] = [53, 39, 38, 75]                              # matches screenshot
            weeks[-6]["in_plan"] = True
        if sym == "AAPL":
            weeks[-1]["scores"] = [62, 64, 66, 70]                              # all 60+ right now
            weeks[-2]["scores"] = [59, 61, 60, 66]
    return weeks


def run(raw_dir, out_dir):
    out_dir = Path(out_dir); out_dir.mkdir(parents=True, exist_ok=True)
    index = []
    for sym, (name, universe, color) in META.items():
        df = load(Path(raw_dir) / f"{sym}.txt")
        df["atr"] = atr(df); df["rsi"] = rsi(df.c)
        df["sma50"] = df.c.rolling(50).mean(); df["sma200"] = df.c.rolling(200).mean()
        e12, e26 = df.c.ewm(span=12, adjust=False).mean(), df.c.ewm(span=26, adjust=False).mean()
        df["macd"] = e12 - e26
        t = len(df) - 1
        price, prev = df.c[t], df.c[t - 1]
        zr = compute_zones(df, t)
        s, r, state = pick(zr, price)
        a = zr["atr"]
        hi52 = df.h.iloc[-252:].max(); lo52 = df.l.iloc[-252:].min()

        # ---------- alert replay over the last ~90 trading days ----------
        events, armed = [], {"support": True, "resistance": True}
        last_fire = {"support": -999, "resistance": -999}
        fire_level = {}
        for tt in range(max(P["min_bars"] + 5, t - 90), t + 1):
            zz = compute_zones(df, tt - 1)  # levels known before today's bar
            if not zz: continue
            ss, rr, _ = pick(zz, df.c[tt - 1])
            aa = zz["atr"]
            for side, z, kind in (("support", ss, "bull"), ("resistance", rr, "bear")):
                # re-arm: moved >1 ATR away from the level, or 5 bars elapsed
                if not armed[side] and side in fire_level:
                    if abs(df.c[tt] - fire_level[side]) > aa and tt - last_fire[side] >= 5:
                        armed[side] = True
                if not z or not armed[side]: continue
                # price must reach the zone AND close near it (a close far through it is a breakout/breakdown, not a test)
                if side == "support":
                    touched = df.l[tt] <= z["high"] and z["low"] - 0.5 * aa <= df.c[tt] <= z["high"] + 0.75 * aa
                else:
                    touched = df.h[tt] >= z["low"] and z["low"] - 0.75 * aa <= df.c[tt] <= z["high"] + 0.5 * aa
                if not touched: continue
                dv = divergence(df, tt, kind)
                if dv:
                    events.append(dict(type=side, date=df.date[tt].strftime("%Y-%m-%d"),
                                       price=round(df.c[tt], 2), zone=[round(z["low"], 2), round(z["high"], 2)],
                                       strength=z["strength"], divergence=dv))
                    armed[side] = False; last_fire[side] = tt; fire_level[side] = z["center"]

        weeks = weekly_mock(sym, list(df.date))
        prev_all60 = False
        for w in weeks:
            if not universe: break
            all60 = w["scores"] is not None and min(w["scores"]) >= 60
            if all60 and not prev_all60:
                events.append(dict(type="scores", date=w["week"], scores=w["scores"]))
            prev_all60 = all60
            if w["in_plan"]:
                events.append(dict(type="plan", date=w["week"]))
        events.sort(key=lambda e: e["date"])

        legacy = dict(support=round(df.sma200[t], 2), resistance=round(hi52, 2), method="SMA200 / 52W high")
        out = dict(
            symbol=sym, name=name, universe=universe, color=color,
            asOf=df.date[t].strftime("%Y-%m-%d"), price=round(price, 2),
            change=round(price - prev, 2), changePct=round((price - prev) / prev * 100, 2),
            bars=[[d.strftime("%Y-%m-%d"), o, h, l, c, v] for d, o, h, l, c, v in
                  zip(df.date, df.o, df.h, df.l, df.c, df.v)],
            technicals=dict(rsi=round(df.rsi[t], 2), macd=round(df.macd[t], 2),
                            sma50=round(df.sma50[t], 2),
                            sma200=None if pd.isna(df.sma200[t]) else round(df.sma200[t], 2),
                            hi52=round(hi52, 2), lo52=round(lo52, 2), atr=round(a, 2),
                            trend="Bullish" if df.c[t] > df.sma50[t] else "Bearish"),
            levels=dict(support=zone_out(s, price, a), resistance=zone_out(r, price, a), state=state,
                        method="swing_v1", params=P["params_version"], bars_used=len(zr["d"]),
                        all_zones=[dict(low=round(z["low"], 2), high=round(z["high"], 2),
                                        strength=z["strength"], touches=z["touches"])
                                   for z in zr["zones"] if z["strength"] >= P["min_strength"]]),
            legacy=legacy, weeks=weeks, events=events,
        )
        (out_dir / f"{sym}.json").write_text(json.dumps(out, separators=(",", ":")))
        index.append(dict(symbol=sym, name=name, universe=universe, color=color, price=out["price"],
                          changePct=out["changePct"]))
        print(sym, out["asOf"], price, "S:", out["levels"]["support"] and (out["levels"]["support"]["low"], out["levels"]["support"]["high"], out["levels"]["support"]["strength"]),
              "R:", out["levels"]["resistance"] and (out["levels"]["resistance"]["low"], out["levels"]["resistance"]["high"], out["levels"]["resistance"]["strength"]),
              state, "| legacy", legacy["support"], legacy["resistance"], "| events:",
              [(e["type"], e["date"]) for e in events])
    (out_dir / "index.json").write_text(json.dumps(index))


if __name__ == "__main__":
    run(sys.argv[1], sys.argv[2])
