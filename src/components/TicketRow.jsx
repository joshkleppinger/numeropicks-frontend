import React from 'react';
import { Ball } from './Ball';

export function TicketRow({ index, balls, special, specialName }) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            '8px',
      background:     '#111827',
      borderRadius:   '14px',
      padding:        '12px 16px',
      marginBottom:   '8px',
    }}>
      {/* Ticket number */}
      <span style={{
        width:      '28px',
        color:      '#64748b',
        fontWeight: '700',
        fontSize:   '14px',
        flexShrink: 0,
      }}>
        #{index}
      </span>

      {/* White balls */}
      {balls.map((b, i) => (
        <Ball key={i} number={b} isSpecial={false} size={44} />
      ))}

      {/* Separator */}
      <span style={{ color: '#475569', fontSize: '13px', margin: '0 4px' }}>
        {specialName}:
      </span>

      {/* Special ball */}
      <Ball number={special} isSpecial={true} size={44} />
    </div>
  );
}
