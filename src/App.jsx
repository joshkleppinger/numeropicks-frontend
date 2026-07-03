import React, { useState, useEffect, useCallback } from 'react';
import { TicketRow } from './components/TicketRow';
import { AccuracyPanel } from './components/AccuracyPanel';
import { DataTable } from './components/DataTable';
import {
  getGames, getAccuracy, getScrapeStatus,
  predict, scrapeAll, downloadUrl,
} from './api';
const logo = process.env.PUBLIC_URL + '/red_ball_logo.png';

const C = {
  bg:'#0a0e1a', panel:'#111827', border:'#1e293b',
  red:'#ef4444', green:'#10b981', sub:'#94a3b8',
  text:'#e2e8f0', grey:'#d1d5db', greyFg:'#1f2937',
};

/* Detects mobile screen (< 600px wide) */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 600);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}
const GAME_COLORS = { powerball:'#ef4444', megamillions:'#3b82f6', superlotto:'#10b981', daily3:'#f59e0b', daily4:'#8b5cf6' };
const GAME_LABELS = { powerball:'Powerball', megamillions:'Mega Millions', superlotto:'SuperLotto Plus', daily3:'Daily 3', daily4:'Daily 4' };

/* Convert any backend-supplied date string (e.g. "Sat, May 17, 2026", "May 17,
 * 2026", "2026-05-17") to American M/D/YYYY format. Returns original input on
 * parse failure so we never display "Invalid Date" to the user. */
export function formatDateMDY(input) {
  if (!input) return '';
  const s = String(input).trim();
  // Already in M/D/YYYY or M/D/YY form? Just return as-is.
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
}

/* Red ball SVG — used for empty/loading states only (not the header logo) */
function RedBallSVG({ size=48, id='rb' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 52 52" style={{display:'block',flexShrink:0}}>
      <circle cx="27" cy="28" r="23" fill="rgba(0,0,0,0.2)"/>
      <circle cx="26" cy="26" r="23" fill="#ef4444"/>
      <circle cx="26" cy="26" r="23" fill={`url(#${id})`}/>
      <defs>
        <radialGradient id={id} cx="38%" cy="32%" r="58%">
          <stop offset="0%" stopColor="#ff8080" stopOpacity="0.7"/>
          <stop offset="100%" stopColor="#7f0000" stopOpacity="0.4"/>
        </radialGradient>
      </defs>
      <path d="M 34 11 A 18 18 0 0 1 44 21" fill="none"
            stroke="rgba(255,200,200,0.65)" strokeWidth="2.5" strokeLinecap="round"/>
    </svg>
  );
}

/* Pill button */
function PillBtn({ children, onClick, bg=C.grey, fg=C.greyFg, disabled=false, style={} }) {
  const [hover,setHover] = useState(false);
  const dk = h => { try { const x=h.replace('#',''); const [r,g,b]=[0,2,4].map(i=>Math.max(0,parseInt(x.slice(i,i+2),16)-28)); return `#${[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')}`; } catch{return h;} };
  return (
    <button onClick={disabled?undefined:onClick}
            onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
            style={{background:disabled?'#555':hover?dk(bg):bg, color:disabled?'#999':fg,
                    border:'none', borderRadius:'999px', padding:'10px 20px',
                    fontWeight:'600', fontSize:'14px', cursor:disabled?'not-allowed':'pointer',
                    fontFamily:'Inter,sans-serif', whiteSpace:'nowrap', transition:'background 0.15s',
                    boxShadow:disabled?'none':`0 1px 0 ${dk(dk(bg))},0 2px 4px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.15)`,
                    ...style}}>
      {children}
    </button>
  );
}

/* Card */
function Card({ title, children, style={} }) {
  return (
    <div style={{background:C.panel, borderRadius:'16px', border:`1px solid ${C.border}`,
                 padding:'20px', marginBottom:'16px', ...style}}>
      {title && <h3 style={{color:C.sub, fontSize:'11px', fontWeight:'700',
                             letterSpacing:'0.1em', textTransform:'uppercase',
                             margin:'0 0 14px 0'}}>{title}</h3>}
      {children}
    </div>
  );
}

/* Download page with inline table viewer */
const GAME_LABELS_DL = { powerball:'Powerball', megamillions:'Mega Millions', superlotto:'SuperLotto Plus', daily3:'Daily 3', daily4:'Daily 4' };
const SPECIAL_NAMES  = { powerball:'PB', megamillions:'MB', superlotto:'MN', daily3:null, daily4:null };
const API_BASE_DL = process.env.REACT_APP_API_URL || 'https://numeropicks-backend-1.onrender.com';

function DownloadsPage({ games, onBack }) {
  const [activeTab, setActiveTab] = React.useState('powerball');
  const tabColor = { powerball:'#ef4444', megamillions:'#3b82f6', superlotto:'#10b981', daily3:'#f59e0b', daily4:'#8b5cf6' };

  return (
    <div style={{maxWidth:'900px', margin:'0 auto', padding:'16px'}}>
      <button onClick={onBack}
              style={{background:'transparent', border:`1px solid ${C.border}`, color:C.sub,
                      borderRadius:'999px', padding:'8px 16px', fontSize:'13px',
                      cursor:'pointer', marginBottom:'20px', fontFamily:'Inter,sans-serif'}}>
        ← Back
      </button>
      <h2 style={{color:C.text, fontSize:'20px', fontWeight:'700', marginBottom:'4px'}}>
        Historical Draw Data
      </h2>
      <p style={{color:C.sub, fontSize:'13px', marginBottom:'16px'}}>
        Browse all past draws or download the complete dataset.
      </p>

      {/* Game tabs */}
      <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
        {Object.entries(GAME_LABELS_DL).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
                  style={{background: activeTab===key ? tabColor[key] : C.panel,
                          color: activeTab===key ? '#fff' : C.sub,
                          border:`1px solid ${activeTab===key ? tabColor[key] : C.border}`,
                          borderRadius:'999px', padding:'7px 16px', fontWeight:'700',
                          fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif',
                          whiteSpace:'nowrap',
                          boxShadow: activeTab===key ? `0 2px 8px ${tabColor[key]}55` : 'none',
                          transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>

      {/* Inline table */}
      <Card>
        <DataTable
          key={activeTab}
          gameKey={activeTab}
          gameName={GAME_LABELS_DL[activeTab]}
          specialName={SPECIAL_NAMES[activeTab]}
          apiBase={API_BASE_DL}
        />
      </Card>
    </div>
  );
}

/* ── Predictions download page ─────────────────────────────────────────────── */
function PredictionsTable({ gameKey, specialName, apiBase, whiteCount }) {
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [page, setPage] = React.useState(0);
  const PAGE = 25;

  React.useEffect(() => {
    setLoading(true);
    setPage(0);
    fetch(`${apiBase}/accuracy/${gameKey}`)
      .then(r => r.json())
      .then(d => {
        const all = [];
        (d.evaluated || []).forEach(p => all.push({ ...p, evaluated: true }));
        (d.pending || []).forEach(p => all.push({ ...p, evaluated: false }));
        // Newest first
        all.sort((a, b) => {
          const da = new Date(a.target_draw_date).getTime();
          const db = new Date(b.target_draw_date).getTime();
          if (isNaN(da) || isNaN(db)) return 0;
          return db - da;
        });
        setRows(all);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [gameKey, apiBase]);

  const pageRows = rows.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(rows.length / PAGE);

  const ballStyle = (isSpecial) => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: '28px', height: '28px', borderRadius: '50%',
    background: isSpecial ? C.red : '#ffffff',
    color: isSpecial ? '#fff' : '#111',
    fontWeight: '700', fontSize: '12px', margin: '0 2px', flexShrink: 0,
  });

  if (loading) return <div style={{textAlign:'center', padding:'40px', color:C.sub}}>Loading past picks…</div>;
  if (error) return <div style={{textAlign:'center', padding:'40px', color:C.red}}>Error: {error}</div>;
  if (!rows.length) return <div style={{textAlign:'center', padding:'40px', color:C.sub}}>No past picks yet.</div>;

  return (
    <>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center',
                   flexWrap:'wrap', gap:'12px', marginBottom:'12px'}}>
        <div style={{color:C.sub, fontSize:'13px'}}>
          {rows.length.toLocaleString()} picks · showing {page*PAGE+1}–{Math.min((page+1)*PAGE, rows.length)}
        </div>
        <div style={{display:'flex', gap:'8px'}}>
          <a href={`${apiBase}/download/${gameKey}/predictions/csv`}
             style={{background:'#1e40af', color:'#fff', textDecoration:'none',
                     padding:'6px 14px', borderRadius:'999px', fontSize:'13px',
                     fontWeight:'700'}}>⬇ Download CSV</a>
          <a href={`${apiBase}/download/${gameKey}/predictions/xlsx`}
             style={{background:'#166534', color:'#fff', textDecoration:'none',
                     padding:'6px 14px', borderRadius:'999px', fontSize:'13px',
                     fontWeight:'700'}}>⬇ Download Excel</a>
        </div>
      </div>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%', borderCollapse:'collapse', fontSize:'13px'}}>
          <thead>
            <tr style={{color:C.sub, borderBottom:`1px solid ${C.border}`}}>
              <th style={{textAlign:'left', padding:'10px 8px'}}>TARGET DATE</th>
              <th style={{textAlign:'left', padding:'10px 8px'}}>PICKED NUMBERS</th>
              {specialName && <th style={{textAlign:'left', padding:'10px 8px', color:C.red}}>{specialName}</th>}
              <th style={{textAlign:'left', padding:'10px 8px'}}>RESULT</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={i} style={{borderBottom:`1px solid ${C.border}`, background: i%2 ? '#0f172a' : 'transparent'}}>
                <td style={{padding:'10px 8px', whiteSpace:'nowrap'}}>{formatDateMDY(r.target_draw_date)}</td>
                <td style={{padding:'10px 8px'}}>
                  {(r.pred_balls || []).map((b, j) => <span key={j} style={ballStyle(false)}>{b}</span>)}
                </td>
                {specialName && (
                  <td style={{padding:'10px 8px'}}>
                    {r.pred_special != null && r.pred_special !== '' ? <span style={ballStyle(true)}>{r.pred_special}</span> : ''}
                  </td>
                )}
                <td style={{padding:'10px 8px', color:C.sub}}>
                  {r.evaluated
                    ? `${r.white_matches} match${r.white_matches !== 1 ? 'es' : ''}${specialName && r.sp_match ? ' + ' + specialName : ''}`
                    : <span style={{color:'#f59e0b'}}>pending</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div style={{display:'flex', justifyContent:'center', gap:'8px', marginTop:'12px'}}>
          <button onClick={()=>setPage(p=>Math.max(0, p-1))} disabled={page===0}
                  style={{background:'transparent', border:`1px solid ${C.border}`, color:C.sub,
                          borderRadius:'999px', padding:'6px 14px', fontSize:'13px',
                          cursor: page===0 ? 'not-allowed' : 'pointer', opacity: page===0 ? 0.5 : 1}}>
            ← Prev
          </button>
          <span style={{color:C.sub, fontSize:'13px', padding:'6px 12px'}}>
            {page+1} / {totalPages}
          </span>
          <button onClick={()=>setPage(p=>Math.min(totalPages-1, p+1))} disabled={page>=totalPages-1}
                  style={{background:'transparent', border:`1px solid ${C.border}`, color:C.sub,
                          borderRadius:'999px', padding:'6px 14px', fontSize:'13px',
                          cursor: page>=totalPages-1 ? 'not-allowed' : 'pointer',
                          opacity: page>=totalPages-1 ? 0.5 : 1}}>
            Next →
          </button>
        </div>
      )}
    </>
  );
}

function PredictionsPage({ onBack }) {
  const [activeTab, setActiveTab] = React.useState('powerball');
  const tabColor = { powerball:'#ef4444', megamillions:'#3b82f6', superlotto:'#10b981', daily3:'#f59e0b', daily4:'#8b5cf6' };
  const whiteCounts = { powerball:5, megamillions:5, superlotto:5, daily3:3, daily4:4 };

  return (
    <div style={{maxWidth:'900px', margin:'0 auto', padding:'16px'}}>
      <button onClick={onBack}
              style={{background:'transparent', border:`1px solid ${C.border}`, color:C.sub,
                      borderRadius:'999px', padding:'8px 16px', fontSize:'13px',
                      cursor:'pointer', marginBottom:'20px', fontFamily:'Inter,sans-serif'}}>
        ← Back
      </button>
      <h2 style={{color:C.text, fontSize:'20px', fontWeight:'700', marginBottom:'4px'}}>
        Historical Numero Picks
      </h2>
      <p style={{color:C.sub, fontSize:'13px', marginBottom:'16px'}}>
        Every prediction Numero has ever made, plus the result once the drawing happened.
      </p>
      <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
        {Object.entries(GAME_LABELS_DL).map(([key, label]) => (
          <button key={key} onClick={() => setActiveTab(key)}
                  style={{background: activeTab===key ? tabColor[key] : C.panel,
                          color: activeTab===key ? '#fff' : C.sub,
                          border:`1px solid ${activeTab===key ? tabColor[key] : C.border}`,
                          borderRadius:'999px', padding:'7px 16px', fontWeight:'700',
                          fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif',
                          whiteSpace:'nowrap',
                          boxShadow: activeTab===key ? `0 2px 8px ${tabColor[key]}55` : 'none',
                          transition:'all 0.15s'}}>
            {label}
          </button>
        ))}
      </div>
      <Card>
        <PredictionsTable
          key={activeTab}
          gameKey={activeTab}
          specialName={SPECIAL_NAMES[activeTab]}
          whiteCount={whiteCounts[activeTab]}
          apiBase={API_BASE_DL}
        />
      </Card>
    </div>
  );
}

/* ── How it works page (workflow diagram) ─────────────────────────────────── */
function HowItWorksPage({ onBack }) {
  const steps = [
    { n:1, title:'Data Collection',
      body:'Pull historical results for all 5 games from the official California Lottery JSON API on a schedule. Every draw ever played is stored in the cloud database.',
      color:'#3b82f6' },
    { n:2, title:'Era Filtering',
      body:'Games change over time (Powerball added 60-69 in 2015; Mega Millions shrank 75→70 in 2017). Numero auto-filters draws so training only uses data reflecting current rules.',
      color:'#8b5cf6' },
    { n:3, title:'7-Method Ensemble',
      body:'Every prediction is the blended output of 7 independent models: frequency, Markov, spectral, gap-weighting, neural network, Monte Carlo, and time-decayed frequency.',
      color:'#ef4444' },
    { n:4, title:'Bayesian Weighting',
      body:'The 7 methods are continuously scored against recent draws via Brier score. Methods that have been accurate lately get more weight in the final blend.',
      color:'#f59e0b' },
    { n:5, title:'Ticket Generation',
      body:'Sample 5 tickets from the blended probability distribution — diverse across number bands, avoiding duplicates. Daily 3/4 tickets are position-aware.',
      color:'#10b981' },
    { n:6, title:'Accuracy Tracking',
      body:'Every prediction is saved permanently. When the drawing happens, Numero compares picks to the result and updates rolling accuracy metrics.',
      color:'#06b6d4' },
  ];

  return (
    <div style={{maxWidth:'760px', margin:'0 auto', padding:'16px'}}>
      <button onClick={onBack}
              style={{background:'transparent', border:`1px solid ${C.border}`, color:C.sub,
                      borderRadius:'999px', padding:'8px 16px', fontSize:'13px',
                      cursor:'pointer', marginBottom:'20px', fontFamily:'Inter,sans-serif'}}>
        ← Back
      </button>
      <h2 style={{color:C.text, fontSize:'22px', fontWeight:'700', marginBottom:'4px'}}>
        How Numero Works
      </h2>
      <p style={{color:C.sub, fontSize:'13px', marginBottom:'20px'}}>
        The full pipeline, from raw draw data to the tickets you see.
      </p>

      <div style={{display:'flex', flexDirection:'column', gap:'0px'}}>
        {steps.map((s, i) => (
          <React.Fragment key={s.n}>
            <div style={{
              background: C.panel,
              border: `2px solid ${s.color}`,
              borderRadius:'14px',
              padding:'16px',
              position:'relative',
            }}>
              <div style={{
                position:'absolute', top:'-14px', left:'16px',
                background: s.color, color:'#fff',
                borderRadius:'999px', padding:'2px 14px',
                fontWeight:'700', fontSize:'12px',
                letterSpacing:'0.05em',
              }}>
                STEP {s.n}
              </div>
              <h3 style={{color:s.color, fontSize:'18px', fontWeight:'700',
                          margin:'6px 0 8px'}}>
                {s.title}
              </h3>
              <p style={{color:C.sub, fontSize:'14px', lineHeight:'1.55', margin:0}}>
                {s.body}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div style={{textAlign:'center', color:C.border, fontSize:'32px',
                           lineHeight:'0.6', padding:'8px 0'}}>
                ↓
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      <div style={{marginTop:'28px', padding:'16px', background:C.panel,
                   border:`1px solid ${C.border}`, borderRadius:'12px'}}>
        <div style={{color:'#fbbf24', fontSize:'12px', fontWeight:'700',
                     letterSpacing:'0.08em', marginBottom:'6px'}}>
          AN HONEST NOTE
        </div>
        <p style={{color:C.sub, fontSize:'13px', lineHeight:'1.55', margin:0}}>
          Modern lotteries use certified random draws, so no model can genuinely
          beat the house edge long-term. Numero can identify structured picks
          that avoid obviously-bad tickets (birthday clusters, all-consecutive
          numbers, etc.) so if you do win, you&apos;re less likely to split the
          prize. That&apos;s modest real value — treat everything else as
          entertainment.
        </p>
      </div>
    </div>
  );
}

/* ── Main App ────────────────────────────────────────────────────────────── */

/* ── Animated analysing spinner with rotating highlight + countdown ────────── */
function AnalyzingSpinner() {
  const TOTAL = 120;
  const [elapsed, setElapsed] = React.useState(0);
  const [angle, setAngle]     = React.useState(0);

  // Triple speed: 9deg every 62ms ≈ 145 deg/sec
  React.useEffect(() => {
    const fast = setInterval(() => setAngle(a => (a + 9) % 360), 62);
    const slow = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => { clearInterval(fast); clearInterval(slow); };
  }, []);

  const remaining = Math.max(0, TOTAL - elapsed);
  const mins      = Math.floor(remaining / 60);
  const secs      = remaining % 60;
  const timeStr   = mins > 0
    ? `${mins}m ${String(secs).padStart(2,'0')}s remaining`
    : `${secs}s remaining`;
  const pct = Math.min(elapsed / TOTAL, 1);

  // Match static Ball component: SIZE=44, same radialGradient, same drop shadow
  // Arc: 50% of 90deg = 45deg extent, at 72% of ball radius (inward, matching static highlight position)
  const toRad  = d => (d * Math.PI) / 180;
  const SIZE   = 44;   // same as static Ball
  const cx     = SIZE / 2;
  const cy     = SIZE / 2;
  const R_ball = SIZE / 2 - 2;        // 20px — ball radius
  const R_arc  = R_ball * 0.72;       // 14.4px — inward, matches static highlight
  const EXTENT = 45;                   // 50% shorter than static 90deg
  const x1 = cx + R_arc * Math.cos(toRad(angle));
  const y1 = cy + R_arc * Math.sin(toRad(angle));
  const x2 = cx + R_arc * Math.cos(toRad(angle + EXTENT));
  const y2 = cy + R_arc * Math.sin(toRad(angle + EXTENT));
  const arcPath = `M ${x1} ${y1} A ${R_arc} ${R_arc} 0 0 1 ${x2} ${y2}`;

  const statusMsg = elapsed < 8  ? 'Waking up server…'
                  : elapsed < 20 ? 'Loading draw history…'
                  :                'Crunching the numbers…';

  return (
    <div style={{textAlign:'center', padding:'40px 0', color:'#94a3b8'}}>
      <div style={{display:'flex', justifyContent:'center', marginBottom:'16px'}}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Drop shadow — matches Ball.jsx */}
          <circle cx={cx+1} cy={cy+2} r={R_ball} fill="rgba(0,0,0,0.18)"/>
          {/* Main ball */}
          <circle cx={cx} cy={cy} r={R_ball} fill="#ef4444"/>
          <circle cx={cx} cy={cy} r={R_ball} fill="url(#spinGrad)"/>
          <defs>
            <radialGradient id="spinGrad" cx="38%" cy="32%" r="58%">
              <stop offset="0%"   stopColor="#ff8080" stopOpacity="0.7"/>
              <stop offset="100%" stopColor="#7f0000" stopOpacity="0.4"/>
            </radialGradient>
          </defs>
          {/* Spinning arc — 45deg, inward at 72% radius, triple speed */}
          <path d={arcPath} fill="none"
                stroke="rgba(255,200,200,0.7)"
                strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>

      <div style={{fontSize:'15px', fontWeight:'600', color:'#e2e8f0', marginBottom:'6px'}}>
        Running 7-method analysis…
      </div>

      <div style={{width:'180px', height:'3px', background:'#1e293b',
                   borderRadius:'2px', margin:'0 auto 10px', overflow:'hidden'}}>
        <div style={{width:`${pct*100}%`, height:'100%',
                     background:'#ef4444', borderRadius:'2px',
                     transition:'width 1s linear'}}/>
      </div>

      <div style={{fontSize:'13px', color:'#64748b'}}>
        {statusMsg}
        {remaining > 0 &&
          <span style={{marginLeft:'8px', color:'#475569'}}>· est. {timeStr}</span>
        }
      </div>
    </div>
  );
}

export default function App() {
  const isMobile = useIsMobile();
  const [activeGame,setActiveGame]     = useState('powerball');
  const [games,setGames]               = useState({});
  const [scrapeStatus,setScrapeStatus] = useState(null);
  const [tickets,setTickets]           = useState(() => {
    // Restore last predictions from localStorage on page load
    try {
      const saved = localStorage.getItem('numero_tickets');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });
  const [accuracy,setAccuracy]         = useState({});
  const [loading,setLoading]           = useState({});
  const [copyLabel,setCopyLabel]       = useState('📋  Copy Numbers');
  const [scrapeLabel,setScrapeLabel]   = useState(null);
  const [showDownloads,setShowDownloads] = useState(false);
  const [showPredictions,setShowPredictions] = useState(false);
  const [showHowItWorks,setShowHowItWorks] = useState(false);

  useEffect(()=>{
    getGames().then(setGames).catch(()=>{});
    getScrapeStatus().then(setScrapeStatus).catch(()=>{});
  },[]);

  // Persist tickets to localStorage whenever they update
  useEffect(()=>{
    try { localStorage.setItem('numero_tickets', JSON.stringify(tickets)); }
    catch {}
  },[tickets]);

  useEffect(()=>{
    getAccuracy(activeGame)
      .then(d=>setAccuracy(a=>({...a,[activeGame]:d})))
      .catch(()=>{});
  },[activeGame]);

  const nextDraw = games[activeGame]?.next_draw||'';
  const friendly = (()=>{
    try {
      if (!nextDraw) return '';
      const formatted = formatDateMDY(nextDraw);
      return `These numbers are for the ${formatted} drawing`;
    } catch { return nextDraw?`Next drawing: ${formatDateMDY(nextDraw)}`:''; }
  })();

  const runAnalysis = useCallback(async()=>{
    setLoading(l=>({...l,[activeGame]:true}));
    try {
      // Try up to 3 times — first attempt may time out waking up the free tier
      let res = null;
      let lastErr = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          res = await predict(activeGame);
          break;
        } catch(e) {
          lastErr = e;
          if (attempt < 3 && e.message.includes('timed out')) {
            await new Promise(r => setTimeout(r, 5000)); // wait 5s then retry
            continue;
          }
          throw e;
        }
      }
      if (!res) throw lastErr;
      setTickets(t=>({...t,[activeGame]:res}));
      const acc = await getAccuracy(activeGame);
      setAccuracy(a=>({...a,[activeGame]:acc}));
    } catch(e){
      alert('Analysis failed: ' + e.message);
    }
    finally { setLoading(l=>({...l,[activeGame]:false})); }
  },[activeGame]);

  const runScrape = useCallback(async()=>{
    setScrapeLabel('Fetching…');
    try {
      await scrapeAll();
      setTimeout(async()=>{
        const [s,g]=await Promise.all([getScrapeStatus(),getGames()]);
        setScrapeStatus(s); setGames(g); setScrapeLabel(null);
      },8000);
    } catch{ setScrapeLabel(null); }
  },[]);

  const copyNumbers = ()=>{
    const t=tickets[activeGame]; if(!t) return;
    const sn=games[activeGame]?.special_name||'SP';
    const lines=[`Numero — ${GAME_LABELS[activeGame]} analysis for ${formatDateMDY(nextDraw)}`,''];
    t.tickets.forEach((tk,i)=>lines.push(
      `#${i+1}:  ${tk.balls.map(b=>String(b).padStart(2)).join('  ')}    ${sn}: ${tk.special}`
    ));
    navigator.clipboard.writeText(lines.join('\n'));
    setCopyLabel('✔  Copied!');
    setTimeout(()=>setCopyLabel('📋  Copy Numbers'),2000);
  };

  const game=games[activeGame]||{};
  const gameTickets=tickets[activeGame];
  const gameAcc=accuracy[activeGame];
  const isStale=scrapeStatus?.stale!==false;
  const isAnalyzing=loading[activeGame];
  const scrapeBtn=scrapeLabel||(isStale?'🔄  Fetch Latest Results':'✔  Results Up To Date');
  const scrapeBg=scrapeLabel?C.grey:(isStale?C.red:C.grey);
  const scrapeFg=(isStale&&!scrapeLabel)?'#fff':C.greyFg;

  /* Downloads page takes over the whole content area */
  if (showDownloads) {
    return (
      <div style={{minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'Inter,sans-serif'}}>
        <header style={{background:C.panel, borderBottom:`1px solid ${C.border}`,
                        padding:'20px 0 16px', textAlign:'center'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
            <img src={logo} alt="Numero" width={42} height={42}
                 style={{borderRadius:'50%', objectFit:'contain'}}/>
            <h1 style={{fontFamily:'"Courier Prime","Courier New",monospace',
                        fontSize:'clamp(2rem,6vw,3rem)', fontWeight:'700',
                        color:C.red, letterSpacing:'0.06em', margin:0}}>
              NUMERO
            </h1>
          </div>
        </header>
        <DownloadsPage games={games} onBack={()=>setShowDownloads(false)}/>
        <footer style={{textAlign:'center', padding:'24px', color:'#334155',
                        fontSize:'12px', borderTop:`1px solid ${C.border}`, marginTop:'8px'}}>
          Numero · For entertainment purposes only · numeropicks.com
        </footer>
      </div>
    );
  }

  /* Predictions page */
  if (showPredictions) {
    return (
      <div style={{minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'Inter,sans-serif'}}>
        <header style={{background:C.panel, borderBottom:`1px solid ${C.border}`,
                        padding:'20px 0 16px', textAlign:'center'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
            <img src={logo} alt="Numero" width={42} height={42}
                 style={{borderRadius:'50%', objectFit:'contain'}}/>
            <h1 style={{fontFamily:'"Courier Prime","Courier New",monospace',
                        fontSize:'clamp(2rem,6vw,3rem)', fontWeight:'700',
                        color:C.red, letterSpacing:'0.06em', margin:0}}>
              NUMERO
            </h1>
          </div>
        </header>
        <PredictionsPage onBack={()=>setShowPredictions(false)}/>
        <footer style={{textAlign:'center', padding:'24px', color:'#334155',
                        fontSize:'12px', borderTop:`1px solid ${C.border}`, marginTop:'8px'}}>
          Numero · For entertainment purposes only · numeropicks.com
        </footer>
      </div>
    );
  }

  /* How It Works page */
  if (showHowItWorks) {
    return (
      <div style={{minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'Inter,sans-serif'}}>
        <header style={{background:C.panel, borderBottom:`1px solid ${C.border}`,
                        padding:'20px 0 16px', textAlign:'center'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
            <img src={logo} alt="Numero" width={42} height={42}
                 style={{borderRadius:'50%', objectFit:'contain'}}/>
            <h1 style={{fontFamily:'"Courier Prime","Courier New",monospace',
                        fontSize:'clamp(2rem,6vw,3rem)', fontWeight:'700',
                        color:C.red, letterSpacing:'0.06em', margin:0}}>
              NUMERO
            </h1>
          </div>
        </header>
        <HowItWorksPage onBack={()=>setShowHowItWorks(false)}/>
        <footer style={{textAlign:'center', padding:'24px', color:'#334155',
                        fontSize:'12px', borderTop:`1px solid ${C.border}`, marginTop:'8px'}}>
          Numero · For entertainment purposes only · numeropicks.com
        </footer>
      </div>
    );
  }

  return (
    <div style={{minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'Inter,sans-serif'}}>

      {/* Header */}
      <header style={{background:C.panel, borderBottom:`1px solid ${C.border}`,
                      padding: isMobile ? '14px 0 10px' : '20px 0 16px',
                      textAlign:'center'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'10px'}}>
          <img src={logo} alt="Numero" width={isMobile?34:42} height={isMobile?34:42}
               style={{borderRadius:'50%', objectFit:'contain'}}/>
          <h1 style={{fontFamily:'"Courier Prime","Courier New",monospace',
                      fontSize: isMobile ? '1.8rem' : 'clamp(2rem,6vw,3rem)',
                      fontWeight:'700', color:C.red,
                      letterSpacing:'0.06em', margin:0}}>
            NUMERO
          </h1>
        </div>
        <p style={{color:C.sub, fontSize: isMobile ? '12px' : '14px', marginTop:'4px'}}>
          Multi-Game Stochastic Lottery Analysis
        </p>
        <div style={{marginTop:'6px', fontSize:'11px', color:C.sub}}>
          {game.row_count?`${game.row_count.toLocaleString()} draws loaded`:'Loading…'}
          {!isMobile && scrapeStatus?.last_scrape&&(
            <span style={{marginLeft:'12px'}}>
              · Last updated: {formatDateMDY(scrapeStatus.last_scrape)}
            </span>
          )}
        </div>
      </header>

      {/* Game tabs */}
      <div style={{display:'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '8px' : '6px',
                   padding: isMobile ? '10px 10px 0' : '16px 16px 0',
                   maxWidth:'800px', margin:'0 auto', overflowX:'auto'}}>
        {/* Row 1: Big 3 games (or all 5 on desktop) */}
        <div style={{display:'flex', gap:'6px', justifyContent: isMobile ? 'center' : 'flex-start', flexWrap:'wrap'}}>
          {['powerball','megamillions','superlotto'].map(key=>(
            <button key={key} onClick={()=>setActiveGame(key)}
                    style={{background:activeGame===key?GAME_COLORS[key]:C.panel,
                            color:activeGame===key?'#fff':C.sub,
                            border:`1px solid ${activeGame===key?GAME_COLORS[key]:C.border}`,
                            borderRadius:'999px',
                            padding: isMobile ? '6px 12px' : '8px 18px',
                            fontWeight:'700',
                            fontSize: isMobile ? '12px' : '13px',
                            cursor:'pointer', whiteSpace:'nowrap',
                            fontFamily:'Inter,sans-serif',
                            boxShadow:activeGame===key?`0 2px 8px ${GAME_COLORS[key]}55`:'none',
                            transition:'all 0.15s', flexShrink:0}}>
              {GAME_LABELS[key]}
            </button>
          ))}
          {/* Desktop: show Daily 3/4 in same row */}
          {!isMobile && ['daily3','daily4'].map(key=>(
            <button key={key} onClick={()=>setActiveGame(key)}
                    style={{background:activeGame===key?GAME_COLORS[key]:C.panel,
                            color:activeGame===key?'#fff':C.sub,
                            border:`1px solid ${activeGame===key?GAME_COLORS[key]:C.border}`,
                            borderRadius:'999px',
                            padding:'8px 18px',
                            fontWeight:'700',
                            fontSize:'13px',
                            cursor:'pointer', whiteSpace:'nowrap',
                            fontFamily:'Inter,sans-serif',
                            boxShadow:activeGame===key?`0 2px 8px ${GAME_COLORS[key]}55`:'none',
                            transition:'all 0.15s', flexShrink:0}}>
              {GAME_LABELS[key]}
            </button>
          ))}
        </div>
        {/* Row 2: Daily 3/4 centered (mobile only) */}
        {isMobile && (
          <div style={{display:'flex', gap:'6px', justifyContent:'center'}}>
            {['daily3','daily4'].map(key=>(
              <button key={key} onClick={()=>setActiveGame(key)}
                      style={{background:activeGame===key?GAME_COLORS[key]:C.panel,
                              color:activeGame===key?'#fff':C.sub,
                              border:`1px solid ${activeGame===key?GAME_COLORS[key]:C.border}`,
                              borderRadius:'999px',
                              padding:'6px 12px',
                              fontWeight:'700',
                              fontSize:'12px',
                              cursor:'pointer', whiteSpace:'nowrap',
                              fontFamily:'Inter,sans-serif',
                              boxShadow:activeGame===key?`0 2px 8px ${GAME_COLORS[key]}55`:'none',
                              transition:'all 0.15s', flexShrink:0}}>
                {GAME_LABELS[key]}
              </button>
            ))}
          </div>
        )}
      </div>

      <main style={{maxWidth:'800px', margin:'0 auto', padding:'16px'}}>

        {/* Button row — just Analyze button, centered */}
        <div style={{display:'flex', gap:'8px',
                     flexWrap:'wrap', marginBottom:'16px',
                     alignItems:'center',
                     justifyContent: isMobile ? 'center' : 'flex-start'}}>
          <PillBtn onClick={runAnalysis} bg={C.grey} fg={C.greyFg} disabled={isAnalyzing}
                   style={{fontSize: isMobile?'15px':'16px',
                           padding: isMobile?'12px 28px':'13px 32px',
                           fontWeight:'700'}}>
            {isAnalyzing?'Analyzing…':'▶  Analyze & Predict'}
          </PillBtn>
        </div>

        {/* Analysis results */}
        <Card>
          {friendly&&(
            <p style={{color:C.sub, fontSize:'13px', fontStyle:'italic', marginBottom:'16px'}}>
              {friendly}
            </p>
          )}

          {isAnalyzing&&(
            <AnalyzingSpinner/>
          )}

          {!isAnalyzing&&!gameTickets&&(
            <div style={{textAlign:'center', padding:'40px 0', color:C.sub}}>
              <div style={{display:'flex', justifyContent:'center', marginBottom:'12px'}}>
                <RedBallSVG size={48} id="emptyRB"/>
              </div>
              <div>Click Analyze &amp; Predict to generate numbers</div>
            </div>
          )}

          {!isAnalyzing&&gameTickets&&(
            <>
              {gameTickets.tickets.map((t,i)=>(
                <TicketRow key={i} index={i+1} balls={t.balls}
                           special={t.special} specialName={gameTickets.special_name}/>
              ))}
              {/* Brier Score badge */}
              {gameTickets.brier && (
                <div style={{marginTop:'10px', marginBottom:'4px',
                             display:'flex', alignItems:'center', gap:'8px',
                             flexWrap:'wrap'}}>
                  <div style={{background:'#1e293b', borderRadius:'10px',
                               padding:'6px 12px', fontSize:'12px'}}>
                    <span style={{color:'#64748b'}}>Brier Score: </span>
                    <span style={{color:'#e2e8f0', fontWeight:'700'}}>
                      {gameTickets.brier.recent_brier?.toFixed(5)}
                    </span>
                    <span style={{color:'#64748b', marginLeft:'6px'}}>
                      (baseline: {gameTickets.brier.baseline_brier?.toFixed(5)})
                    </span>
                  </div>
                </div>
              )}
              <div style={{marginTop:'8px'}}>
                <PillBtn onClick={copyNumbers}
                         bg={copyLabel.includes('Copied')?C.green:C.grey}
                         fg={copyLabel.includes('Copied')?'#fff':C.greyFg}>
                  {copyLabel}
                </PillBtn>
              </div>
            </>
          )}
        </Card>

        {/* Accuracy inline below */}
        <Card title="Analysis Accuracy">
          {!gameAcc
            ?<div style={{color:C.sub, padding:'8px 0'}}>Loading accuracy data…</div>
            :<AccuracyPanel data={gameAcc}
                            specialName={game.special_name}
                            whiteCount={game.white_count}/>
          }
        </Card>

      </main>

      {/* Bottom actions */}
      <div style={{textAlign:'center', padding:'12px 16px 0', maxWidth:'800px',
                   margin:'0 auto', display:'flex', flexWrap:'wrap',
                   gap:'8px', justifyContent:'center'}}>
        <button onClick={()=>setShowDownloads(true)}
                style={{background:'transparent', border:`1px solid ${C.border}`,
                        color:C.sub, borderRadius:'999px', padding:'8px 20px',
                        fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif'}}>
          ⬇  Download past drawing results
        </button>
        <button onClick={()=>setShowPredictions(true)}
                style={{background:'transparent', border:`1px solid ${C.border}`,
                        color:C.sub, borderRadius:'999px', padding:'8px 20px',
                        fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif'}}>
          ⬇  Download past picks
        </button>
        <button onClick={()=>setShowHowItWorks(true)}
                style={{background:'transparent', border:`1px solid ${C.border}`,
                        color:C.sub, borderRadius:'999px', padding:'8px 20px',
                        fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif'}}>
          ℹ  How it works
        </button>
      </div>

      <footer style={{textAlign:'center', padding:'24px', color:'#334155',
                      fontSize:'12px', borderTop:`1px solid ${C.border}`, marginTop:'16px'}}>
        Numero · For entertainment purposes only · numeropicks.com
      </footer>
    </div>
  );
}
