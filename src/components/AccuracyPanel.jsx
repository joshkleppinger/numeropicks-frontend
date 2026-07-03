import React from 'react';
import { formatDateMDY } from '../App';

export function AccuracyPanel({ data, specialName, whiteCount }) {
  if (!data) return null;
  const { summary, evaluated, pending } = data;
  const hasSpecial = !!specialName;
  // For Daily 3/4 (no special ball) the "score" percentage is derived from
  // the fraction of matched white balls: 1 match = 1/N × 100.  For big
  // games we keep whatever score the backend supplied.
  const scoreFor = (r) => {
    if (!hasSpecial && whiteCount) {
      return Math.round((r.white_matches / whiteCount) * 100);
    }
    return Math.round(r.score * 100);
  };

  const scoreColor = (pct) => {
    if (pct >= 60) return '#10b981';
    if (pct >= 17) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{ marginTop: '24px' }}>
      {/* Summary badges */}
      {summary && (
        <div style={{
          display:       'flex',
          gap:           '12px',
          flexWrap:      'wrap',
          marginBottom:  '16px',
        }}>
          {[
            { label: 'Last Drawing', value: `${summary.last_score}%`, color: scoreColor(summary.last_score) },
            { label: 'Avg Matches',
              value: `${summary.avg_white_matches}/${whiteCount || 5}` },
            hasSpecial && { label: `${specialName} Hit Rate`, value: `${summary.special_hit_rate}%` },
            { label: 'Rounds Tracked', value: summary.total_rounds },
          ].filter(Boolean).map(({ label, value, color }) => (
            <div key={label} style={{
              background:   '#111827',
              borderRadius: '12px',
              padding:      '10px 16px',
              flex:         '1 1 120px',
              minWidth:     '110px',
            }}>
              <div style={{ color: color || '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>
                {label}
              </div>
              <div style={{
                color:      color || '#e2e8f0',
                fontSize:   '22px',
                fontWeight: '700',
              }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pending */}
      {pending && pending.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#f59e0b', fontSize: '13px', marginBottom: '8px' }}>
            ⏳ PENDING ({pending.length})
          </h4>
          {pending.slice(0, 3).map((p, i) => (
            <div key={i} style={{
              background:   '#111827',
              borderRadius: '10px',
              padding:      '10px 14px',
              marginBottom: '6px',
              fontSize:     '13px',
              color:        '#94a3b8',
            }}>
              <span style={{ color: '#e2e8f0' }}>{formatDateMDY(p.target_draw_date)}</span>
              {p.awaiting_scrape && <span style={{ color: '#f59e0b', marginLeft: '8px' }}>⚠ awaiting scrape</span>}
            </div>
          ))}
        </div>
      )}

      {/* Recent evaluated */}
      {evaluated && evaluated.length > 0 && (
        <div>
          <h4 style={{ color: '#64748b', fontSize: '13px', marginBottom: '8px' }}>
            ✅ RECENT RESULTS
          </h4>
          {[...evaluated].reverse().slice(0, 5).map((r, i) => {
            const pct = scoreFor(r);
            return (
            <div key={i} style={{
              background:   '#111827',
              borderRadius: '10px',
              padding:      '10px 14px',
              marginBottom: '6px',
              fontSize:     '13px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8' }}>{formatDateMDY(r.target_draw_date)}</span>
                <span style={{
                  color:      scoreColor(pct),
                  fontWeight: '700',
                }}>
                  {pct}%
                </span>
              </div>
              <div style={{ color: '#475569', fontSize: '12px' }}>
                {r.white_matches} match{r.white_matches !== 1 ? 'es' : ''}
                {hasSpecial && r.sp_match ? ` + ${specialName}` : ''}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
