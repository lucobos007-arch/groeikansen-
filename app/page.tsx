"use client";

import { useEffect, useRef, useState } from "react";

type Speed = "fast" | "fresh";
type Tab = "scan" | "stock" | "portfolio" | "news";

interface Opportunity {
  rank?: number;
  ticker?: string;
  company?: string;
  sector?: string;
  marketcap?: string;
  horizon?: string;
  risk?: string;
  reason?: string;
  upside?: string;
  downside?: string;
  entry?: string;
  exit?: string;
}
interface ScanResult {
  market_note?: string;
  opportunities?: Opportunity[];
  _salvaged?: boolean;
}
interface StockResult {
  found: boolean;
  message?: string;
  ticker?: string;
  company?: string;
  sector?: string;
  horizon?: string;
  risk?: string;
  what_they_do?: string;
  recent?: string;
  upcoming?: string;
  bull?: string;
  bear?: string;
  valuation?: string;
  suits?: string;
  buying_tips?: string[];
  assessment?: string;
}

interface PortfolioPick {
  rank?: number;
  ticker?: string;
  company?: string;
  sector?: string;
  angle?: string;
  price?: string;
  risk_label?: string;
  risk_score?: number;
  thesis?: string;
  catalyst?: string;
  bull?: string;
  bear?: string;
  kill_criteria?: string;
  allocation_pct?: number;
}
interface PortfolioResult {
  profile_summary?: string;
  themes?: string[];
  picks?: PortfolioPick[];
  cash_reserve_pct?: number;
  portfolio_risk?: string;
  watchlist?: string[];
  _salvaged?: boolean;
}

interface Profile {
  risk: string;
  amount: number;
  horizon: string;
  sectors: string;
  region: string;
  goal: string;
}

interface NewsItem {
  company?: string;
  ticker?: string;
  sentiment?: string;
  headline?: string;
  summary?: string;
  why_it_matters?: string;
  source?: string;
  date?: string;
}
interface NewsResult {
  scanned_at?: string;
  items?: NewsItem[];
  _salvaged?: boolean;
}

const ROTATING: string[] = [
  "Markt aan het uitkammen…",
  "Katalysatoren wegen…",
  "Kleine en middelgrote namen scannen…",
  "Bull- en bear-scenario's afzetten…",
  "Kans-risicoverhouding rangschikken…",
];

const ROTATING_PORTFOLIO: string[] = [
  "Marktthema's aan het scannen…",
  "Kandidaten screenen op drie invalshoeken…",
  "Zwakke verhalen aan het afkeuren…",
  "Katalysatoren en kill-criteria aan het bepalen…",
  "Portfolio-allocatie aan het verdelen…",
];

const ROTATING_NEWS: string[] = [
  "WSJ, NYT, FT, Barron's, The Economist en FD doorzoeken…",
  "Grote plannen en investeringen eruit filteren…",
  "Slecht nieuws en tegenvallers checken…",
  "Bronnen en datums verifiëren…",
  "Nieuws rangschikken op belang…",
];

function riskClass(risk?: string): string {
  const r = (risk || "").toLowerCase();
  if (r.includes("hoog")) return "risk-hoog";
  if (r.includes("gemiddeld")) return "risk-gemiddeld";
  if (r.includes("laag")) return "risk-laag";
  return "";
}

function newsClass(sentiment?: string): string {
  const s = (sentiment || "").toLowerCase();
  if (s.includes("goed")) return "news-goed";
  if (s.includes("slecht")) return "news-slecht";
  return "";
}

function formatEuro(n: number): string {
  return n.toLocaleString("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}

export default function Page() {
  const [speed, setSpeed] = useState<Speed>("fast");
  const [tab, setTab] = useState<Tab>("scan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [scan, setScan] = useState<ScanResult | null>(null);
  const [stock, setStock] = useState<StockResult | null>(null);
  const [query, setQuery] = useState("");

  const [profile, setProfile] = useState<Profile>({
    risk: "Gemiddeld",
    amount: 10000,
    horizon: "3-5 jaar",
    sectors: "",
    region: "Wereldwijd",
    goal: "Mix",
  });
  const [portfolio, setPortfolio] = useState<PortfolioResult | null>(null);
  const [news, setNews] = useState<NewsResult | null>(null);

  const [rotIdx, setRotIdx] = useState(0);
  const rotTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const rotList =
    tab === "portfolio" ? ROTATING_PORTFOLIO : tab === "news" ? ROTATING_NEWS : ROTATING;

  useEffect(() => {
    if (loading) {
      setRotIdx(0);
      rotTimer.current = setInterval(() => {
        setRotIdx((i) => (i + 1) % rotList.length);
      }, 2200);
    } else if (rotTimer.current) {
      clearInterval(rotTimer.current);
      rotTimer.current = null;
    }
    return () => {
      if (rotTimer.current) clearInterval(rotTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Registreer de service worker (voor 'Zet op beginscherm').
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const loadSub =
    tab === "news"
      ? "🌐 Doorzoekt altijd live WSJ, NYT, FT, Barron's, The Economist en FD."
      : speed === "fresh"
      ? "🌐 Vers van het web — zoekt live op, dit duurt wat langer…"
      : "⚡ Snel — een paar seconden, zonder web search.";

  async function runScan() {
    setLoading(true);
    setError(null);
    setScan(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout.");
      setScan(data as ScanResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  async function runStock() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setStock(null);
    try {
      const res = await fetch("/api/stock", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: query.trim(), mode: speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout.");
      setStock(data as StockResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  async function runNews() {
    setLoading(true);
    setError(null);
    setNews(null);
    try {
      const res = await fetch("/api/news", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout.");
      setNews(data as NewsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  async function runPortfolio() {
    setLoading(true);
    setError(null);
    setPortfolio(null);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, mode: speed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Onbekende fout.");
      setPortfolio(data as PortfolioResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Er ging iets mis.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header className="header">
        <img className="logo" src="/icon-192.png" alt="" />
        <div>
          <h1 className="title">
            Groei<span className="accent">kansen</span>
          </h1>
          <p className="subtitle">Je persoonlijke AI-marktbriefing</p>
        </div>
      </header>

      {/* Snelheidsschakelaar */}
      <div className="speed" role="group" aria-label="Snelheid">
        <button
          className={speed === "fast" ? "active" : ""}
          onClick={() => setSpeed("fast")}
          disabled={loading}
        >
          ⚡ Snel
        </button>
        <button
          className={speed === "fresh" ? "active fresh" : ""}
          onClick={() => setSpeed("fresh")}
          disabled={loading}
        >
          🌐 Vers van het web
        </button>
      </div>
      <p className="speed-hint">
        {speed === "fast"
          ? "Snelle analyse uit de kennis van het model — een paar seconden."
          : "Zoekt live nieuws op het web — actueler, maar trager."}
      </p>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={tab === "scan" ? "active" : ""}
          onClick={() => setTab("scan")}
          disabled={loading}
        >
          Marktscan
        </button>
        <button
          className={tab === "stock" ? "active" : ""}
          onClick={() => setTab("stock")}
          disabled={loading}
        >
          Aandeel checken
        </button>
        <button
          className={tab === "portfolio" ? "active" : ""}
          onClick={() => setTab("portfolio")}
          disabled={loading}
        >
          Portfolio-analyse
        </button>
        <button
          className={tab === "news" ? "active" : ""}
          onClick={() => setTab("news")}
          disabled={loading}
        >
          Nieuws
        </button>
      </div>

      {/* Inhoud per tab */}
      {tab === "scan" ? (
        <>
          <button className="btn-primary" onClick={runScan} disabled={loading}>
            Analyseer de markt
          </button>
        </>
      ) : tab === "stock" ? (
        <div className="search-row">
          <input
            type="text"
            placeholder="Ticker of bedrijfsnaam…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !loading) runStock();
            }}
            disabled={loading}
          />
          <button className="btn-primary" onClick={runStock} disabled={loading}>
            Check
          </button>
        </div>
      ) : tab === "news" ? (
        <>
          <button className="btn-primary" onClick={runNews} disabled={loading}>
            Haal het laatste nieuws op
          </button>
        </>
      ) : (
        <div className="profile-form">
          <div className="form-row">
            <label>Risicobereidheid</label>
            <select
              value={profile.risk}
              onChange={(e) => setProfile((p) => ({ ...p, risk: e.target.value }))}
              disabled={loading}
            >
              <option>Laag</option>
              <option>Gemiddeld</option>
              <option>Hoog</option>
            </select>
          </div>
          <div className="form-row">
            <label>Bedrag</label>
            <div className="amount-input">
              <span>€</span>
              <input
                type="number"
                min={100}
                step={100}
                value={profile.amount}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, amount: Number(e.target.value) || 0 }))
                }
                disabled={loading}
              />
            </div>
          </div>
          <div className="form-row">
            <label>Horizon</label>
            <select
              value={profile.horizon}
              onChange={(e) => setProfile((p) => ({ ...p, horizon: e.target.value }))}
              disabled={loading}
            >
              <option value="1-2 jaar">1-2 jaar</option>
              <option value="3-5 jaar">3-5 jaar</option>
              <option value="7-10+ jaar">7-10+ jaar</option>
            </select>
          </div>
          <div className="form-row">
            <label>Regio</label>
            <select
              value={profile.region}
              onChange={(e) => setProfile((p) => ({ ...p, region: e.target.value }))}
              disabled={loading}
            >
              <option value="Wereldwijd">Wereldwijd</option>
              <option value="VS">VS</option>
              <option value="Europa (incl. NL)">Europa (incl. NL)</option>
            </select>
          </div>
          <div className="form-row">
            <label>Doel</label>
            <select
              value={profile.goal}
              onChange={(e) => setProfile((p) => ({ ...p, goal: e.target.value }))}
              disabled={loading}
            >
              <option value="Groei">Groei</option>
              <option value="Dividend">Dividend</option>
              <option value="Mix">Mix</option>
            </select>
          </div>
          <div className="form-row">
            <label>Sectorvoorkeur</label>
            <input
              type="text"
              placeholder="bijv. tech, gezondheidszorg — leeg = open voor alles"
              value={profile.sectors}
              onChange={(e) => setProfile((p) => ({ ...p, sectors: e.target.value }))}
              disabled={loading}
            />
          </div>
          <button className="btn-primary" onClick={runPortfolio} disabled={loading}>
            Analyseer mijn portfolio
          </button>
        </div>
      )}

      {/* Laadstatus */}
      {loading && (
        <div className="loading">
          <div className="spinner" />
          <div className="rot">{rotList[rotIdx]}</div>
          <div className="load-sub">{loadSub}</div>
        </div>
      )}

      {/* Fout */}
      {!loading && error && <div className="error-box">{error}</div>}

      {/* Marktscan-resultaat */}
      {!loading && tab === "scan" && scan && (
        <div style={{ marginTop: 18 }}>
          <div className="risk-banner">
            <strong>Let op:</strong> dezelfde kracht die +25% kan opleveren, kan
            net zo hard −25% kosten. De meeste van zulke weddenschappen komen
            niet uit. Spreid en zet nooit meer in dan je kunt missen.
          </div>

          {scan.market_note && <p className="market-note">{scan.market_note}</p>}

          {(scan.opportunities || []).map((o, i) => {
            const rank = o.rank ?? i + 1;
            return (
              <div className="card" key={i}>
                <div className="card-top">
                  <div className={`rank ${rank <= 3 ? "top" : ""}`}>{rank}</div>
                  <div className="head-main">
                    <div className="ticker">{o.ticker || "—"}</div>
                    <div className="company">{o.company}</div>
                    <div className="badges">
                      {o.sector && (
                        <span className="badge sector">{o.sector}</span>
                      )}
                      {o.marketcap && <span className="badge">{o.marketcap}</span>}
                      {o.horizon && <span className="badge">⏱ {o.horizon}</span>}
                      {o.risk && (
                        <span className={`badge ${riskClass(o.risk)}`}>
                          Risico: {o.risk}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {o.reason && <p className="reason">{o.reason}</p>}

                <div className="lines">
                  {o.upside && (
                    <div className="line bull">
                      <span className="tag">Bull 12 mnd</span>
                      <span className="val">{o.upside}</span>
                    </div>
                  )}
                  {o.downside && (
                    <div className="line bear">
                      <span className="tag">Risico ↓</span>
                      <span className="val">{o.downside}</span>
                    </div>
                  )}
                  {o.entry && (
                    <div className="line buy">
                      <span className="tag">Kopen</span>
                      <span className="val">{o.entry}</span>
                    </div>
                  )}
                  {o.exit && (
                    <div className="line sell">
                      <span className="tag">Verkopen</span>
                      <span className="val">{o.exit}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {scan._salvaged && (
            <p className="speed-hint">
              Let op: het antwoord werd deels afgekapt; enkele kansen zijn
              gered uit het beschikbare deel.
            </p>
          )}
        </div>
      )}

      {/* Aandeel-resultaat */}
      {!loading && tab === "stock" && stock && (
        <div style={{ marginTop: 18 }}>
          {stock.found === false ? (
            <div className="notfound">
              {stock.message || "Dit aandeel kon niet worden gevonden."}
            </div>
          ) : (
            <div className="stock-panel">
              <h2>{stock.ticker || "—"}</h2>
              <div className="company">{stock.company}</div>
              <div className="badges">
                {stock.sector && (
                  <span className="badge sector">{stock.sector}</span>
                )}
                {stock.horizon && (
                  <span className="badge">⏱ {stock.horizon}</span>
                )}
                {stock.risk && (
                  <span className={`badge ${riskClass(stock.risk)}`}>
                    Risico: {stock.risk}
                  </span>
                )}
              </div>

              {stock.what_they_do && (
                <div className="stock-section">
                  <div className="label">Wat ze doen</div>
                  <p>{stock.what_they_do}</p>
                </div>
              )}
              {stock.recent && (
                <div className="stock-section">
                  <div className="label">Recent</div>
                  <p>{stock.recent}</p>
                </div>
              )}
              {stock.upcoming && (
                <div className="stock-section">
                  <div className="label">Op komst</div>
                  <p>{stock.upcoming}</p>
                </div>
              )}
              {stock.bull && (
                <div className="stock-section">
                  <div className="label bull">Bull-scenario</div>
                  <p>{stock.bull}</p>
                </div>
              )}
              {stock.bear && (
                <div className="stock-section">
                  <div className="label bear">Bear-scenario</div>
                  <p>{stock.bear}</p>
                </div>
              )}
              {stock.valuation && (
                <div className="stock-section">
                  <div className="label">Waardering</div>
                  <p>{stock.valuation}</p>
                </div>
              )}
              {stock.suits && (
                <div className="stock-section">
                  <div className="label">Past bij</div>
                  <p>{stock.suits}</p>
                </div>
              )}
              {stock.buying_tips && stock.buying_tips.length > 0 && (
                <div className="stock-section">
                  <div className="label">Koop-tips</div>
                  <ul className="tips">
                    {stock.buying_tips.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
              {stock.assessment && (
                <div className="assessment">{stock.assessment}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Portfolio-resultaat */}
      {!loading && tab === "portfolio" && portfolio && (
        <div style={{ marginTop: 18 }}>
          <div className="risk-banner">
            <strong>Let op:</strong> dit is een compacte, in één keer gegenereerde
            analyse — geen vervanging voor eigen onderzoek. Controleer cijfers en
            data zelf voor je iets koopt.
          </div>

          {portfolio.profile_summary && (
            <p className="market-note">{portfolio.profile_summary}</p>
          )}

          {portfolio.themes && portfolio.themes.length > 0 && (
            <div className="theme-list">
              {portfolio.themes.map((t, i) => (
                <span className="badge theme" key={i}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {(portfolio.picks || []).map((p, i) => {
            const rank = p.rank ?? i + 1;
            const amount =
              typeof p.allocation_pct === "number"
                ? formatEuro((profile.amount * p.allocation_pct) / 100)
                : null;
            return (
              <div className="card" key={i}>
                <div className="card-top">
                  <div className={`rank ${rank <= 3 ? "top" : ""}`}>{rank}</div>
                  <div className="head-main">
                    <div className="ticker">{p.ticker || "—"}</div>
                    <div className="company">{p.company}</div>
                    <div className="badges">
                      {p.angle && <span className="badge sector">{p.angle}</span>}
                      {p.sector && <span className="badge">{p.sector}</span>}
                      {p.price && <span className="badge">{p.price}</span>}
                      {p.risk_label && (
                        <span className={`badge ${riskClass(p.risk_label)}`}>
                          Risico: {p.risk_label}
                          {typeof p.risk_score === "number" ? ` (${p.risk_score}/10)` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {p.thesis && <p className="reason">{p.thesis}</p>}

                <div className="lines">
                  {p.catalyst && (
                    <div className="line buy">
                      <span className="tag">Katalysator</span>
                      <span className="val">{p.catalyst}</span>
                    </div>
                  )}
                  {p.bull && (
                    <div className="line bull">
                      <span className="tag">Bull</span>
                      <span className="val">{p.bull}</span>
                    </div>
                  )}
                  {p.bear && (
                    <div className="line bear">
                      <span className="tag">Bear</span>
                      <span className="val">{p.bear}</span>
                    </div>
                  )}
                  {p.kill_criteria && (
                    <div className="line sell">
                      <span className="tag">Kill-criteria</span>
                      <span className="val">{p.kill_criteria}</span>
                    </div>
                  )}
                </div>

                {typeof p.allocation_pct === "number" && (
                  <div className="allocation">
                    <div className="allocation-bar">
                      <div
                        className="allocation-fill"
                        style={{ width: `${Math.min(p.allocation_pct, 100)}%` }}
                      />
                    </div>
                    <div className="allocation-label">
                      {p.allocation_pct}% {amount ? `· ${amount}` : ""}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {typeof portfolio.cash_reserve_pct === "number" && (
            <div className="card cash-card">
              <div className="head-main">
                <div className="ticker">Cash-reserve</div>
              </div>
              <div className="allocation">
                <div className="allocation-bar">
                  <div
                    className="allocation-fill cash"
                    style={{ width: `${Math.min(portfolio.cash_reserve_pct, 100)}%` }}
                  />
                </div>
                <div className="allocation-label">
                  {portfolio.cash_reserve_pct}% ·{" "}
                  {formatEuro((profile.amount * portfolio.cash_reserve_pct) / 100)}
                </div>
              </div>
            </div>
          )}

          {portfolio.portfolio_risk && (
            <div className="assessment">
              <div className="label bear" style={{ marginBottom: 4 }}>
                Grootste portfoliorisico
              </div>
              {portfolio.portfolio_risk}
            </div>
          )}

          {portfolio.watchlist && portfolio.watchlist.length > 0 && (
            <div className="stock-section" style={{ marginTop: 16 }}>
              <div className="label">Watchlist</div>
              <ul className="tips">
                {portfolio.watchlist.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {portfolio._salvaged && (
            <p className="speed-hint">
              Let op: het antwoord werd deels afgekapt; enkele onderdelen zijn
              gered uit het beschikbare deel.
            </p>
          )}
        </div>
      )}

      {/* Nieuws-resultaat */}
      {!loading && tab === "news" && news && (
        <div style={{ marginTop: 18 }}>
          {news.scanned_at && (
            <p className="market-note">Doorzocht: {news.scanned_at}</p>
          )}

          {(news.items || []).map((n, i) => (
            <div className="card" key={i}>
              <div className="card-top">
                <div className="head-main">
                  <div className="ticker">{n.company || "—"}</div>
                  {n.ticker && <div className="company">{n.ticker}</div>}
                  <div className="badges">
                    {n.sentiment && (
                      <span className={`badge ${newsClass(n.sentiment)}`}>
                        {n.sentiment === "goed" || (n.sentiment || "").toLowerCase().includes("goed")
                          ? "▲ Goed nieuws"
                          : "▼ Slecht nieuws"}
                      </span>
                    )}
                    {n.source && <span className="badge source">{n.source}</span>}
                    {n.date && <span className="badge">{n.date}</span>}
                  </div>
                </div>
              </div>

              {n.headline && <p className="reason">{n.headline}</p>}

              <div className="lines">
                {n.summary && (
                  <div className="line">
                    <span className="tag">Wat gebeurde er</span>
                    <span className="val">{n.summary}</span>
                  </div>
                )}
                {n.why_it_matters && (
                  <div className="line buy">
                    <span className="tag">Waarom relevant</span>
                    <span className="val">{n.why_it_matters}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {news.items && news.items.length === 0 && (
            <div className="notfound">
              Geen relevant nieuws gevonden in de toegestane bronnen. Probeer het later opnieuw.
            </div>
          )}

          {news._salvaged && (
            <p className="speed-hint">
              Let op: het antwoord werd deels afgekapt; enkele nieuwsitems zijn
              gered uit het beschikbare deel.
            </p>
          )}
        </div>
      )}

      <footer className="footer">
        Deze inzichten zijn live door AI gegenereerd uit nieuws en kunnen fouten
        bevatten. Controleer cijfers altijd zelf. Dit is research en geen
        financieel advies; er worden geen garanties of koersvoorspellingen
        gegeven. Raadpleeg bij echte beslissingen een gediplomeerd financieel
        adviseur. Beleg nooit met geld dat je niet kunt missen.
      </footer>
    </div>
  );
}
