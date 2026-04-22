import React, { useState, useEffect } from 'react';

const C = {
  bg:'#0a0e1a', panel:'#111827', border:'#1e293b',
  red:'#ef4444', text:'#e2e8f0', sub:'#94a3b8',
  rowAlt:'#0f172a',
};

export function DataTable({ gameKey, gameName, specialName, apiBase }) {
  const [rows, setRows]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [page, setPage]     = useState(0);
  const PAGE = 50;

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetch(`${apiBase}/history/${gameKey}?limit=500`)
      .then(r => r.json())
      .then(d => { setRows(d.draws || []); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [gameKey, apiBase]);

  const pageRows  = rows.slice(page * PAGE, (page + 1) * PAGE);
  const totalPages = Math.ceil(rows.length / PAGE);

  const ballStyle = (isSpecial) => ({
    display:      'inline-flex',
    alignItems:   'center',
    justifyContent:'center',
    width:         '28px',
    height:        '28px',
    borderRadius:  '50%',
    background:    isSpecial ? C.red : '#ffffff',
    color:         isSpecial ? '#fff' : '#111',
    fontWeight:    '700',
    fontSize:      '12px',
    margin:        '0 2px',
    flexShrink:    0,
  });

  if (loading) return (
    <div style={{textAlign:'center', padding:'40px', color:C.sub}}>
      Loading draw history…
    </div>
  );
  if (error) return (
    <div style={{textAlign:'center', padding:'40px', color:C.red}}>
      Error loading data: {error}
    </div>
  );
  if (!rows.length) return (
    <div style={{textAlign:'center', padding:'40px', color:C.sub}}>
      No data yet — run a scrape first.
    </div>
  );

  return (
    <div>
      {/* Summary + download buttons */}
      <div style={{display:'flex', justifyContent:'space-between',
                   alignItems:'center', flexWrap:'wrap', gap:'10px',
                   marginBottom:'14px'}}>
        <span style={{color:C.sub, fontSize:'13px'}}>
          {rows.length.toLocaleString()} draws · showing {page*PAGE+1}–{Math.min((page+1)*PAGE, rows.length)}
        </span>
        <div style={{display:'flex', gap:'8px'}}>
          <a href={`${apiBase}/download/${gameKey}/csv`}
             style={{background:'#1e40af', color:'#fff', borderRadius:'999px',
                     padding:'7px 14px', fontSize:'12px', fontWeight:'600',
                     textDecoration:'none', whiteSpace:'nowrap',
                     boxShadow:'0 1px 0 #1228a0, 0 2px 4px rgba(0,0,0,0.3)'}}>
            ⬇ Download CSV
          </a>
          <a href={`${apiBase}/download/${gameKey}/xlsx`}
             style={{background:'#166534', color:'#fff', borderRadius:'999px',
                     padding:'7px 14px', fontSize:'12px', fontWeight:'600',
                     textDecoration:'none', whiteSpace:'nowrap',
                     boxShadow:'0 1px 0 #0d3d1e, 0 2px 4px rgba(0,0,0,0.3)'}}>
            ⬇ Download Excel
          </a>
        </div>
      </div>

      {/* Table */}
      <div style={{overflowX:'auto', borderRadius:'12px',
                   border:`1px solid ${C.border}`}}>
        <table style={{width:'100%', borderCollapse:'collapse',
                       fontSize:'13px', fontFamily:'Inter,sans-serif'}}>
          <thead>
            <tr style={{background:'#1e293b'}}>
              <th style={{padding:'10px 14px', textAlign:'left',
                          color:C.sub, fontWeight:'700', whiteSpace:'nowrap',
                          fontSize:'11px', letterSpacing:'0.05em',
                          textTransform:'uppercase'}}>
                Date
              </th>
              <th style={{padding:'10px 14px', textAlign:'left',
                          color:C.sub, fontWeight:'700',
                          fontSize:'11px', letterSpacing:'0.05em',
                          textTransform:'uppercase'}}>
                Numbers
              </th>
              <th style={{padding:'10px 14px', textAlign:'center',
                          color:C.red, fontWeight:'700',
                          fontSize:'11px', letterSpacing:'0.05em',
                          textTransform:'uppercase'}}>
                {specialName}
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row, i) => (
              <tr key={i} style={{
                background: i % 2 === 0 ? C.panel : C.rowAlt,
                borderTop: `1px solid ${C.border}`,
              }}>
                <td style={{padding:'8px 14px', color:C.sub,
                             whiteSpace:'nowrap', fontSize:'12px'}}>
                  {row.date}
                </td>
                <td style={{padding:'8px 14px'}}>
                  <div style={{display:'flex', flexWrap:'wrap', gap:'2px'}}>
                    {row.balls.map((b, j) => (
                      <span key={j} style={ballStyle(false)}>{b}</span>
                    ))}
                  </div>
                </td>
                <td style={{padding:'8px 14px', textAlign:'center'}}>
                  <span style={ballStyle(true)}>{row.special}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{display:'flex', justifyContent:'center',
                     alignItems:'center', gap:'8px', marginTop:'14px'}}>
          <button
            onClick={() => setPage(p => Math.max(0, p-1))}
            disabled={page === 0}
            style={{background:'#1e293b', color: page===0 ? '#475569' : C.text,
                    border:'none', borderRadius:'999px', padding:'7px 16px',
                    cursor: page===0 ? 'not-allowed' : 'pointer',
                    fontSize:'13px', fontFamily:'Inter,sans-serif'}}>
            ← Prev
          </button>
          <span style={{color:C.sub, fontSize:'13px'}}>
            Page {page+1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages-1, p+1))}
            disabled={page === totalPages-1}
            style={{background:'#1e293b',
                    color: page===totalPages-1 ? '#475569' : C.text,
                    border:'none', borderRadius:'999px', padding:'7px 16px',
                    cursor: page===totalPages-1 ? 'not-allowed' : 'pointer',
                    fontSize:'13px', fontFamily:'Inter,sans-serif'}}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
