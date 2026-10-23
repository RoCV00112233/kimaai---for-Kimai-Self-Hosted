import React from 'react';

interface SteampunkClockIconProps {
  className?: string;
  size?: number | string;
}

export const SteampunkClockIcon: React.FC<SteampunkClockIconProps> = ({
  className = 'w-6 h-6',
  size,
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
    >
      <defs>
        {/* Outer Bezel Bronze/Brass Gradient */}
        <linearGradient id="sp-brass-grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f3c27e" />
          <stop offset="25%" stopColor="#c88b44" />
          <stop offset="50%" stopColor="#8d5624" />
          <stop offset="75%" stopColor="#dfa763" />
          <stop offset="100%" stopColor="#9a5e2a" />
        </linearGradient>

        {/* Dark Watchface Radial Gradient */}
        <radialGradient id="sp-dial-grad" cx="50" cy="50" r="45" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1a2332" />
          <stop offset="65%" stopColor="#0e141f" />
          <stop offset="100%" stopColor="#070a10" />
        </radialGradient>

        {/* Gear Copper Gradient */}
        <linearGradient id="sp-copper-grad" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#e28c46" />
          <stop offset="50%" stopColor="#a35820" />
          <stop offset="100%" stopColor="#703610" />
        </linearGradient>

        {/* Emerald Jewel Accent Gradient */}
        <radialGradient id="sp-jewel-grad" cx="50" cy="50" r="5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#022c22" />
        </radialGradient>
      </defs>

      {/* Outer Steampunk Cogwheel / Gear Silhouette */}
      <g stroke="url(#sp-brass-grad)" strokeWidth="1.5" fill="none">
        {/* 12 Outer Gear Teeth */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
          <rect
            key={angle}
            x="47"
            y="2"
            width="6"
            height="5"
            rx="1"
            fill="url(#sp-brass-grad)"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>

      {/* Main Bezel Ring */}
      <circle cx="50" cy="50" r="44" stroke="url(#sp-brass-grad)" strokeWidth="3" fill="none" />
      <circle cx="50" cy="50" r="41" stroke="#070a10" strokeWidth="1" fill="none" />

      {/* Inner Watchface Dial */}
      <circle cx="50" cy="50" r="40" fill="url(#sp-dial-grad)" stroke="#3e2916" strokeWidth="1" />

      {/* Steampunk Brass Rivets at Cardinal Positions (12, 3, 6, 9) */}
      {[0, 90, 180, 270].map((angle) => (
        <circle
          key={`rivet-${angle}`}
          cx="50"
          cy="14"
          r="1.8"
          fill="#f3c27e"
          stroke="#5a3514"
          strokeWidth="0.8"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {/* Secondary Rivets at diagonal positions (45, 135, 225, 315) */}
      {[45, 135, 225, 315].map((angle) => (
        <circle
          key={`rivet-sub-${angle}`}
          cx="50"
          cy="14"
          r="1.2"
          fill="#c88b44"
          stroke="#40230d"
          strokeWidth="0.6"
          transform={`rotate(${angle} 50 50)`}
        />
      ))}

      {/* Minimalist Internal Skeletal Cog Wheels (Steampunk watch movement) */}
      {/* Upper-left sub-gear */}
      <g transform="translate(38, 36) scale(0.42)">
        <circle cx="0" cy="0" r="18" stroke="url(#sp-copper-grad)" strokeWidth="2.5" fill="none" strokeDasharray="3 2" opacity="0.6" />
        <circle cx="0" cy="0" r="10" stroke="#a35820" strokeWidth="1.5" fill="none" opacity="0.5" />
        <line x1="-15" y1="0" x2="15" y2="0" stroke="#a35820" strokeWidth="1.5" opacity="0.4" />
        <line x1="0" y1="-15" x2="0" y2="15" stroke="#a35820" strokeWidth="1.5" opacity="0.4" />
      </g>

      {/* Lower-right sub-gear */}
      <g transform="translate(62, 60) scale(0.35)">
        <circle cx="0" cy="0" r="22" stroke="url(#sp-brass-grad)" strokeWidth="2.5" fill="none" strokeDasharray="4 2" opacity="0.5" />
        <circle cx="0" cy="0" r="12" stroke="#8d5624" strokeWidth="1.5" fill="none" opacity="0.4" />
      </g>

      {/* Dial Hour Markers Track */}
      <circle cx="50" cy="50" r="32" stroke="#5a3e22" strokeWidth="0.75" strokeDasharray="1 7.37" fill="none" opacity="0.7" />

      {/* Minimalist Clock Hands */}
      {/* Hour Hand (pointing at 10 o'clock - angle ~ -60deg) */}
      <g transform="rotate(-60 50 50)">
        {/* Counterweight */}
        <circle cx="50" cy="58" r="3" fill="#8d5624" stroke="#e0a96d" strokeWidth="0.8" />
        {/* Hand Stem */}
        <path
          d="M48.8 50 L49 33 L47 30 L50 22 L53 30 L51 33 L51.2 50 Z"
          fill="url(#sp-brass-grad)"
          stroke="#40230d"
          strokeWidth="0.7"
        />
        {/* Open heart / Spade window */}
        <circle cx="50" cy="29" r="1.3" fill="#0e141f" />
      </g>

      {/* Minute Hand (pointing at ~2 o'clock - angle ~ 54deg) */}
      <g transform="rotate(54 50 50)">
        {/* Counterweight needle */}
        <line x1="50" y1="50" x2="50" y2="61" stroke="#e0a96d" strokeWidth="1.4" strokeLinecap="round" />
        {/* Slender Dagger Minute Hand */}
        <path
          d="M49 50 L49.3 22 L47.8 19 L50 12 L52.2 19 L50.7 22 L51 50 Z"
          fill="url(#sp-brass-grad)"
          stroke="#40230d"
          strokeWidth="0.7"
        />
      </g>

      {/* Center Jewel & Cap Pinion */}
      <circle cx="50" cy="50" r="5.5" fill="url(#sp-brass-grad)" stroke="#2b1708" strokeWidth="1" />
      <circle cx="50" cy="50" r="3" fill="url(#sp-jewel-grad)" stroke="#10b981" strokeWidth="0.6" />
      <circle cx="49" cy="49" r="0.8" fill="#a7f3d0" />
    </svg>
  );
};
