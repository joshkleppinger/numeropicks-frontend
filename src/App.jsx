import React, { useState, useEffect, useCallback } from 'react';
import { TicketRow } from './components/TicketRow';
import { AccuracyPanel } from './components/AccuracyPanel';
import { DataTable } from './components/DataTable';
import {
  getGames, getAccuracy, getScrapeStatus,
  predict, scrapeAll, downloadUrl,
} from './api';
import logo from './assets/red_ball_logo.png';

const C = {
  bg:'#0a0e1a', panel:'#111827', border:'#1e293b',
  red:'#ef4444', green:'#10b981', sub:'#94a3b8',
  text:'#e2e8f0', grey:'#d1d5db', greyFg:'#1f2937',
};
const GAME_COLORS = { powerball:'#ef4444', megamillions:'#3b82f6', superlotto:'#10b981' };
const GAME_LABELS = { powerball:'Powerball', megamillions:'Mega Millions', superlotto:'SuperLotto Plus' };

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
const GAME_LABELS_DL = { powerball:'Powerball', megamillions:'Mega Millions', superlotto:'SuperLotto Plus' };
const SPECIAL_NAMES  = { powerball:'PB', megamillions:'MB', superlotto:'MN' };
const API_BASE_DL = process.env.REACT_APP_API_URL || 'https://numeropicks-backend-1.onrender.com';

function DownloadsPage({ games, onBack }) {
  const [activeTab, setActiveTab] = React.useState('powerball');
  const tabColor = { powerball:'#ef4444', megamillions:'#3b82f6', superlotto:'#10b981' };

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

/* ── Main App ────────────────────────────────────────────────────────────── */
export default function App() {
  const [activeGame,setActiveGame]     = useState('powerball');
  const [games,setGames]               = useState({});
  const [scrapeStatus,setScrapeStatus] = useState(null);
  const [tickets,setTickets]           = useState({});
  const [accuracy,setAccuracy]         = useState({});
  const [loading,setLoading]           = useState({});
  const [copyLabel,setCopyLabel]       = useState('📋  Copy Numbers');
  const [scrapeLabel,setScrapeLabel]   = useState(null);
  const [showDownloads,setShowDownloads] = useState(false);

  useEffect(()=>{
    getGames().then(setGames).catch(()=>{});
    getScrapeStatus().then(setScrapeStatus).catch(()=>{});
  },[]);

  useEffect(()=>{
    getAccuracy(activeGame)
      .then(d=>setAccuracy(a=>({...a,[activeGame]:d})))
      .catch(()=>{});
  },[activeGame]);

  const nextDraw = games[activeGame]?.next_draw||'';
  const friendly = (()=>{
    try {
      const d=new Date(nextDraw+'T12:00:00');
      const day=d.toLocaleDateString('en-US',{weekday:'long'});
      const mon=d.toLocaleDateString('en-US',{month:'long'});
      const n=d.getDate();
      const sfx=[,'st','nd','rd'][((n%100-20)%10||n%100-10)?n%10:0]||'th';
      return `These numbers are for the ${day}, ${mon} ${n}${sfx} drawing`;
    } catch { return nextDraw?`Next drawing: ${nextDraw}`:''; }
  })();

  const runAnalysis = useCallback(async()=>{
    setLoading(l=>({...l,[activeGame]:true}));
    try {
      const res=await predict(activeGame);
      setTickets(t=>({...t,[activeGame]:res}));
      const acc=await getAccuracy(activeGame);
      setAccuracy(a=>({...a,[activeGame]:acc}));
    } catch(e){ alert('Analysis failed: '+e.message); }
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
    const lines=[`Numero — ${GAME_LABELS[activeGame]} analysis for ${nextDraw}`,''];
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
            <img src={logo} alt="Numero" width={47} height={47}
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

  return (
    <div style={{minHeight:'100vh', background:C.bg, color:C.text, fontFamily:'Inter,sans-serif'}}>

      {/* Header */}
      <header style={{background:C.panel, borderBottom:`1px solid ${C.border}`,
                      padding:'20px 0 16px', textAlign:'center'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
          {/* Real PNG logo — bundled as static asset, always works */}
          <img src={logo} alt="Numero" width={47} height={47}
               style={{borderRadius:'50%', objectFit:'contain'}}/>
          <h1 style={{fontFamily:'"Courier Prime","Courier New",monospace',
                      fontSize:'clamp(2rem,6vw,3rem)', fontWeight:'700',
                      color:C.red, letterSpacing:'0.06em', margin:0}}>
            NUMERO
          </h1>
        </div>
        <p style={{color:C.sub, fontSize:'14px', marginTop:'6px'}}>
          Multi-Game Stochastic Lottery Analysis
        </p>
        <div style={{marginTop:'10px', fontSize:'12px', color:C.sub}}>
          {game.row_count?`${game.row_count.toLocaleString()} draws loaded`:'Loading…'}
          {scrapeStatus?.last_scrape&&(
            <span style={{marginLeft:'12px'}}>
              · Last updated: {new Date(scrapeStatus.last_scrape).toLocaleDateString()}
            </span>
          )}
        </div>
      </header>

      {/* Game tabs */}
      <div style={{display:'flex', gap:'8px', padding:'16px 16px 0',
                   maxWidth:'800px', margin:'0 auto', overflowX:'auto'}}>
        {Object.keys(GAME_LABELS).map(key=>(
          <button key={key} onClick={()=>setActiveGame(key)}
                  style={{background:activeGame===key?GAME_COLORS[key]:C.panel,
                          color:activeGame===key?'#fff':C.sub,
                          border:`1px solid ${activeGame===key?GAME_COLORS[key]:C.border}`,
                          borderRadius:'999px', padding:'8px 18px',
                          fontWeight:'700', fontSize:'13px', cursor:'pointer',
                          whiteSpace:'nowrap', fontFamily:'Inter,sans-serif',
                          boxShadow:activeGame===key?`0 2px 8px ${GAME_COLORS[key]}55`:'none',
                          transition:'all 0.15s'}}>
            {GAME_LABELS[key]}
          </button>
        ))}
      </div>

      <main style={{maxWidth:'800px', margin:'0 auto', padding:'16px'}}>

        {/* Button row: Fetch | Analyze | Download */}
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap',
                     marginBottom:'16px', alignItems:'center'}}>
          <PillBtn onClick={runScrape} bg={scrapeBg} fg={scrapeFg} disabled={!!scrapeLabel}>
            {scrapeBtn}
          </PillBtn>
          <PillBtn onClick={runAnalysis} bg={C.grey} fg={C.greyFg} disabled={isAnalyzing}>
            {isAnalyzing?'Analyzing…':'▶  Analyze & Predict'}
          </PillBtn>
          <PillBtn onClick={()=>setShowDownloads(true)} bg={C.grey} fg={C.greyFg}>
            ⬇  Download Data
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
            <div style={{textAlign:'center', padding:'40px 0', color:C.sub}}>
              <div style={{display:'flex', justifyContent:'center', marginBottom:'12px'}}>
                <RedBallSVG size={48} id="loadRB"/>
              </div>
              <div>Running 7-method analysis…</div>
              <div style={{fontSize:'12px', marginTop:'6px', color:'#475569'}}>
                This takes 15–30 seconds
              </div>
            </div>
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
              <div style={{marginTop:'12px'}}>
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
            :<AccuracyPanel data={gameAcc} specialName={game.special_name||'SP'}/>
          }
        </Card>

      </main>

      <footer style={{textAlign:'center', padding:'24px', color:'#334155',
                      fontSize:'12px', borderTop:`1px solid ${C.border}`, marginTop:'8px'}}>
        Numero · For entertainment purposes only · numeropicks.com
      </footer>
    </div>
  );
}
