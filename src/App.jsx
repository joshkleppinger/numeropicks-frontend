import React, { useState, useEffect, useCallback } from 'react';
import { Ball } from './components/Ball';
import { TicketRow } from './components/TicketRow';
import { AccuracyPanel } from './components/AccuracyPanel';
import {
  getGames, getAccuracy, getScrapeStatus,
  predict, scrapeAll, downloadUrl,
} from './api';

// ── Colour constants ──────────────────────────────────────────────────────────
const C = {
  bg:      '#0a0e1a',
  panel:   '#111827',
  border:  '#1e293b',
  accent:  '#6c63ff',
  red:     '#ef4444',
  green:   '#10b981',
  amber:   '#f59e0b',
  text:    '#e2e8f0',
  sub:     '#94a3b8',
  grey:    '#d1d5db',
  greyFg:  '#1f2937',
};

const GAME_COLORS = {
  powerball:    '#ef4444',
  megamillions: '#3b82f6',
  superlotto:   '#10b981',
};

const GAME_LABELS = {
  powerball:    'Powerball',
  megamillions: 'Mega Millions',
  superlotto:   'SuperLotto Plus',
};

// ── Pill Button ───────────────────────────────────────────────────────────────
function PillBtn({ children, onClick, bg = C.grey, fg = C.greyFg,
                   disabled = false, style = {} }) {
  const [hover, setHover] = useState(false);
  const darken = hex => {
    try {
      const h = hex.replace('#','');
      const [r,g,b] = [0,2,4].map(i=>Math.max(0,parseInt(h.slice(i,i+2),16)-28));
      return `#${[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
    } catch { return hex; }
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:   disabled ? '#555' : hover ? darken(bg) : bg,
        color:        disabled ? '#999' : fg,
        border:       'none',
        borderRadius: '999px',
        padding:      '10px 20px',
        fontWeight:   '600',
        fontSize:     '14px',
        cursor:       disabled ? 'not-allowed' : 'pointer',
        transition:   'background 0.15s',
        fontFamily:   'Inter, sans-serif',
        // 3D effect
        boxShadow: disabled ? 'none' :
          `0 1px 0 ${darken(darken(bg))}, 0 2px 4px rgba(0,0,0,0.3),
           inset 0 1px 0 rgba(255,255,255,0.15)`,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

// ── Section card ─────────────────────────────────────────────────────────────
function Card({ title, children, style = {} }) {
  return (
    <div style={{
      background:   C.panel,
      borderRadius: '16px',
      border:       `1px solid ${C.border}`,
      padding:      '20px',
      marginBottom: '16px',
      ...style,
    }}>
      {title && (
        <h3 style={{
          color:        C.sub,
          fontSize:     '11px',
          fontWeight:   '700',
          letterSpacing:'0.1em',
          textTransform:'uppercase',
          marginBottom: '14px',
        }}>
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [activeGame, setActiveGame]     = useState('powerball');
  const [games, setGames]               = useState({});
  const [scrapeStatus, setScrapeStatus] = useState(null);
  const [tickets, setTickets]           = useState({});
  const [accuracy, setAccuracy]         = useState({});
  const [loading, setLoading]           = useState({});
  const [copyLabel, setCopyLabel]       = useState('📋  Copy Predictions');
  const [scrapeLabel, setScrapeLabel]   = useState(null);
  const [activeTab, setActiveTab]       = useState('predict'); // predict | accuracy | history

  // ── Load game metadata ────────────────────────────────────────────────────
  useEffect(() => {
    getGames()
      .then(setGames)
      .catch(() => {});
    getScrapeStatus()
      .then(setScrapeStatus)
      .catch(() => {});
  }, []);

  // ── Load accuracy when game/tab changes ──────────────────────────────────
  useEffect(() => {
    if (activeTab !== 'accuracy') return;
    if (accuracy[activeGame]) return;
    getAccuracy(activeGame)
      .then(d => setAccuracy(a => ({ ...a, [activeGame]: d })))
      .catch(() => {});
  }, [activeGame, activeTab]);

  // ── Derive friendly draw date ─────────────────────────────────────────────
  const nextDraw = games[activeGame]?.next_draw || '';
  const friendly = (() => {
    try {
      const d   = new Date(nextDraw + 'T12:00:00');
      const day = d.toLocaleDateString('en-US', { weekday:'long' });
      const mon = d.toLocaleDateString('en-US', { month:'long'  });
      const n   = d.getDate();
      const sfx = [,'st','nd','rd'][((n%100-20)%10||n%100-10)?n%10:0]||'th';
      return `These numbers are for the ${day}, ${mon} ${n}${sfx} drawing`;
    } catch { return nextDraw ? `Next drawing: ${nextDraw}` : ''; }
  })();

  // ── Run analysis ──────────────────────────────────────────────────────────
  const runAnalysis = useCallback(async () => {
    setLoading(l => ({ ...l, [activeGame]: true }));
    try {
      const res = await predict(activeGame);
      setTickets(t => ({ ...t, [activeGame]: res }));
      // Refresh accuracy after new prediction
      const acc = await getAccuracy(activeGame);
      setAccuracy(a => ({ ...a, [activeGame]: acc }));
    } catch (e) {
      alert('Analysis failed: ' + e.message);
    } finally {
      setLoading(l => ({ ...l, [activeGame]: false }));
    }
  }, [activeGame]);

  // ── Scrape ────────────────────────────────────────────────────────────────
  const runScrape = useCallback(async () => {
    setScrapeLabel('Fetching…');
    try {
      await scrapeAll();
      setTimeout(async () => {
        const s = await getScrapeStatus();
        setScrapeStatus(s);
        setScrapeLabel(null);
        const g = await getGames();
        setGames(g);
      }, 8000);
    } catch (e) {
      setScrapeLabel(null);
    }
  }, []);

  // ── Copy ─────────────────────────────────────────────────────────────────
  const copyPredictions = () => {
    const t = tickets[activeGame];
    if (!t) return;
    const sn = games[activeGame]?.special_name || 'SP';
    const lines = [`NumeroPicks — ${GAME_LABELS[activeGame]} predictions for ${nextDraw}`, ''];
    t.tickets.forEach((tk, i) => {
      lines.push(`#${i+1}:  ${tk.balls.map(b => String(b).padStart(2)).join('  ')}    ${sn}: ${tk.special}`);
    });
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyLabel('✔  Copied!');
    setTimeout(() => setCopyLabel('📋  Copy Predictions'), 2000);
  };

  const game       = games[activeGame] || {};
  const gameColor  = GAME_COLORS[activeGame];
  const gameTickets= tickets[activeGame];
  const gameAcc    = accuracy[activeGame];
  const isStale    = scrapeStatus?.stale !== false;
  const isAnalyzing= loading[activeGame];
  const rowCount   = game.row_count;
  const scrapeBtn  = scrapeLabel || (isStale ? '🔄  Fetch Latest Results' : '✔  Results Up To Date');
  const scrapeBg   = scrapeLabel ? C.grey : (isStale ? C.red : C.grey);
  const scrapeFg   = (isStale && !scrapeLabel) ? '#fff' : C.greyFg;

  return (
    <div style={{
      minHeight:  '100vh',
      background: C.bg,
      color:      C.text,
      fontFamily: 'Inter, sans-serif',
    }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{
        background:  C.panel,
        borderBottom:`1px solid ${C.border}`,
        padding:     '20px 0 16px',
        textAlign:   'center',
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'12px' }}>
          {/* Animated ball logo */}
          <Ball number="" isSpecial size={48} />
          <h1 style={{
            fontFamily:    '"Courier Prime", "Courier New", monospace',
            fontSize:      'clamp(2rem, 6vw, 3rem)',
            fontWeight:    '700',
            color:         C.red,
            letterSpacing: '0.06em',
            margin:        0,
          }}>
            NUMEROPICKS
          </h1>
        </div>
        <p style={{ color:C.sub, fontSize:'14px', marginTop:'6px' }}>
          Multi-Game Stochastic Lottery Predictor
        </p>

        {/* Row count + scrape status */}
        <div style={{ marginTop:'10px', fontSize:'12px', color:C.sub }}>
          {rowCount ? `${rowCount.toLocaleString()} draws loaded` : 'Loading…'}
          {scrapeStatus?.last_scrape && (
            <span style={{ marginLeft:'12px' }}>
              · Last updated: {new Date(scrapeStatus.last_scrape).toLocaleDateString()}
            </span>
          )}
        </div>
      </header>

      {/* ── Game tabs ──────────────────────────────────────────────────── */}
      <div style={{
        display:        'flex',
        gap:            '8px',
        padding:        '16px 16px 0',
        maxWidth:       '800px',
        margin:         '0 auto',
        overflowX:      'auto',
      }}>
        {Object.keys(GAME_LABELS).map(key => (
          <button
            key={key}
            onClick={() => setActiveGame(key)}
            style={{
              background:   activeGame === key ? GAME_COLORS[key] : C.panel,
              color:        activeGame === key ? '#fff' : C.sub,
              border:       `1px solid ${activeGame === key ? GAME_COLORS[key] : C.border}`,
              borderRadius: '999px',
              padding:      '8px 18px',
              fontWeight:   '700',
              fontSize:     '13px',
              cursor:       'pointer',
              whiteSpace:   'nowrap',
              fontFamily:   'Inter, sans-serif',
              boxShadow:    activeGame === key
                ? `0 2px 8px ${GAME_COLORS[key]}55`
                : 'none',
              transition:   'all 0.15s',
            }}
          >
            {GAME_LABELS[key]}
          </button>
        ))}
      </div>

      {/* ── Main content ───────────────────────────────────────────────── */}
      <main style={{ maxWidth:'800px', margin:'0 auto', padding:'16px' }}>

        {/* Action buttons */}
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'16px' }}>
          <PillBtn
            onClick={runScrape}
            bg={scrapeBg}
            fg={scrapeFg}
            disabled={!!scrapeLabel}
          >
            {scrapeBtn}
          </PillBtn>
          <PillBtn
            onClick={runAnalysis}
            bg={C.grey}
            fg={C.greyFg}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing…' : '▶  Analyze & Predict'}
          </PillBtn>
        </div>

        {/* Tab switcher */}
        <div style={{ display:'flex', gap:'4px', marginBottom:'16px' }}>
          {['predict','accuracy','downloads'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background:   activeTab === tab ? C.border : 'transparent',
                color:        activeTab === tab ? C.text : C.sub,
                border:       'none',
                borderRadius: '8px',
                padding:      '6px 14px',
                fontSize:     '13px',
                fontWeight:   '600',
                cursor:       'pointer',
                fontFamily:   'Inter, sans-serif',
                textTransform:'capitalize',
              }}
            >
              {tab === 'predict' ? '🎱 Predictions'
               : tab === 'accuracy' ? '📊 Accuracy'
               : '⬇ Downloads'}
            </button>
          ))}
        </div>

        {/* ── PREDICTIONS TAB ────────────────────────────────────────── */}
        {activeTab === 'predict' && (
          <Card>
            {/* Drawing date banner */}
            {friendly && (
              <p style={{
                color:        C.sub,
                fontSize:     '13px',
                fontStyle:    'italic',
                marginBottom: '16px',
              }}>
                {friendly}
              </p>
            )}

            {isAnalyzing && (
              <div style={{ textAlign:'center', padding:'40px 0', color:C.sub }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>⚙️</div>
                <div>Running 7-method analysis…</div>
                <div style={{ fontSize:'12px', marginTop:'6px', color:'#475569' }}>
                  This takes 15–30 seconds
                </div>
              </div>
            )}

            {!isAnalyzing && !gameTickets && (
              <div style={{ textAlign:'center', padding:'40px 0', color:C.sub }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>🎱</div>
                <div>Click Analyze & Predict to generate predictions</div>
              </div>
            )}

            {!isAnalyzing && gameTickets && (
              <>
                {gameTickets.tickets.map((t, i) => (
                  <TicketRow
                    key={i}
                    index={i + 1}
                    balls={t.balls}
                    special={t.special}
                    specialName={gameTickets.special_name}
                  />
                ))}
                <div style={{ marginTop:'12px' }}>
                  <PillBtn
                    onClick={copyPredictions}
                    bg={copyLabel.includes('Copied') ? C.green : C.grey}
                    fg={copyLabel.includes('Copied') ? '#fff' : C.greyFg}
                  >
                    {copyLabel}
                  </PillBtn>
                </div>
              </>
            )}
          </Card>
        )}

        {/* ── ACCURACY TAB ───────────────────────────────────────────── */}
        {activeTab === 'accuracy' && (
          <Card title="Prediction Accuracy">
            {!gameAcc
              ? <div style={{ color:C.sub, padding:'20px 0' }}>Loading…</div>
              : <AccuracyPanel
                  data={gameAcc}
                  specialName={game.special_name || 'SP'}
                />
            }
          </Card>
        )}

        {/* ── DOWNLOADS TAB ──────────────────────────────────────────── */}
        {activeTab === 'downloads' && (
          <div>
            <p style={{ color:C.sub, fontSize:'13px', marginBottom:'16px' }}>
              Download complete historical draw data as a spreadsheet.
            </p>
            {Object.entries(GAME_LABELS).map(([key, label]) => (
              <Card key={key} style={{ marginBottom:'12px' }}>
                <div style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  flexWrap:       'wrap',
                  gap:            '12px',
                }}>
                  <div>
                    <div style={{ fontWeight:'700', fontSize:'15px' }}>{label}</div>
                    <div style={{ color:C.sub, fontSize:'12px', marginTop:'3px' }}>
                      {games[key]?.row_count?.toLocaleString() || '—'} draws
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    <a
                      href={downloadUrl(key, 'csv')}
                      style={{
                        background:   '#1e40af',
                        color:        '#fff',
                        borderRadius: '999px',
                        padding:      '8px 16px',
                        fontSize:     '13px',
                        fontWeight:   '600',
                        textDecoration:'none',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      ⬇ CSV
                    </a>
                    <a
                      href={downloadUrl(key, 'xlsx')}
                      style={{
                        background:   '#166534',
                        color:        '#fff',
                        borderRadius: '999px',
                        padding:      '8px 16px',
                        fontSize:     '13px',
                        fontWeight:   '600',
                        textDecoration:'none',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      ⬇ Excel
                    </a>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer style={{
        textAlign:    'center',
        padding:      '24px',
        color:        '#334155',
        fontSize:     '12px',
        borderTop:    `1px solid ${C.border}`,
        marginTop:    '24px',
      }}>
        NumeroPicks · For entertainment purposes only · numeropicks.com
      </footer>
    </div>
  );
}
