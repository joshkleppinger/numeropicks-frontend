import React from 'react';
import { Ball } from './Ball';

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 600);
  React.useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return isMobile;
}

export function TicketRow({ index, balls, special, specialName }) {
  const isMobile = useIsMobile();
  const ballSize = isMobile ? 32 : 44;

  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            isMobile ? '4px' : '8px',
      background:     '#111827',
      borderRadius:   '14px',
      padding:        isMobile ? '8px 10px' : '12px 16px',
      marginBottom:   '8px',
      flexWrap:       'nowrap',
      overflowX:      'auto',
    }}>
      {/* Ticket number */}
      <span style={{
        width:      isMobile ? '20px' : '28px',
        color:      '#64748b',
        fontWeight: '700',
        fontSize:   isMobile ? '11px' : '14px',
        flexShrink: 0,
      }}>
        #{index}
      </span>

      {/* White balls */}
      {balls.map((b, i) => (
        <Ball key={i} number={b} isSpecial={false} size={ballSize} />
      ))}

      {/* Separator */}
      <span style={{
        color:     '#475569',
        fontSize:  isMobile ? '10px' : '13px',
        margin:    '0 2px',
        flexShrink: 0,
      }}>
        {specialName}:
      </span>

      {/* Special ball */}
      <Ball number={special} isSpecial={true} size={ballSize} />
    </div>
  );
}
