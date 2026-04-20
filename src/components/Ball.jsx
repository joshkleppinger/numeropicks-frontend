import React from 'react';

export function Ball({ number, isSpecial = false, size = 44 }) {
  const bg     = isSpecial ? '#ef4444' : '#ffffff';
  const fg     = isSpecial ? '#ffffff' : '#111111';
  const r      = size / 2;
  const pad    = size * 0.12;
  const inner  = size - pad * 2;
  const font   = Math.round(size * 0.34);

  // Highlight arc: top-right (special) or shadow arc: bottom-left (white)
  const arcR   = inner / 2;
  const arcCx  = r;
  const arcCy  = r;

  // SVG arc helper — draws a circular arc
  function arcPath(cx, cy, radius, startDeg, endDeg) {
    const toRad = d => (d * Math.PI) / 180;
    // SVG angles: 0 = 3-o'clock, clockwise
    const x1 = cx + radius * Math.cos(toRad(startDeg));
    const y1 = cy + radius * Math.sin(toRad(startDeg));
    const x2 = cx + radius * Math.cos(toRad(endDeg));
    const y2 = cy + radius * Math.sin(toRad(endDeg));
    return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`;
  }

  // Red ball highlight: top-right band  → SVG -90° to 0° (12 o'clock to 3 o'clock)
  // White ball shadow:  bottom-left     → SVG  90° to 180° (6 o'clock to 9 o'clock)
  const arcStart   = isSpecial ? -90 : 90;
  const arcEnd     = isSpecial ?   0 : 180;
  const arcColor   = isSpecial ? 'rgba(255,200,200,0.7)' : 'rgba(180,180,180,0.55)';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block', flexShrink: 0 }}
    >
      {/* Drop shadow */}
      <circle cx={r + 1} cy={r + 2} r={r - 2} fill="rgba(0,0,0,0.18)" />

      {/* Main circle */}
      <circle cx={r} cy={r} r={r - 2} fill={bg} />

      {/* Subtle inner gradient overlay for depth */}
      <circle
        cx={r} cy={r} r={r - 2}
        fill={isSpecial
          ? 'url(#redGrad)'
          : 'url(#whiteGrad)'}
      />

      <defs>
        <radialGradient id="redGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#ff6b6b" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#8b0000" stopOpacity="0.3" />
        </radialGradient>
        <radialGradient id="whiteGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d0d0d0" stopOpacity="0.2" />
        </radialGradient>
      </defs>

      {/* Highlight / shadow arc */}
      <path
        d={arcPath(arcCx, arcCy, arcR, arcStart, arcEnd)}
        fill="none"
        stroke={arcColor}
        strokeWidth={size * 0.055}
        strokeLinecap="round"
      />

      {/* Number */}
      <text
        x={r}
        y={r + font * 0.36}
        textAnchor="middle"
        fontSize={font}
        fontWeight="700"
        fontFamily="Inter, sans-serif"
        fill={fg}
      >
        {number}
      </text>
    </svg>
  );
}
