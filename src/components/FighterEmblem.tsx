import { FighterId } from '../game/types';

interface FighterEmblemProps {
  id: FighterId;
  className?: string;
}

export function FighterEmblem({ id, className = 'w-9 h-9' }: FighterEmblemProps) {
  if (id === 'blaze') {
    return (
      <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#7F1D1D" stroke="#0F172A" strokeWidth="2.5" />
        <path
          d="M11 26 L12 16 L9 12 L15 14 L18 6 L21 14 L27 11 L24 16 L25 26 Z"
          fill="#EF4444"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M14 21 L22 20 L21 24 L14 24 Z" fill="#FDE047" />
      </svg>
    );
  }

  if (id === 'gale') {
    return (
      <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#1E3A8A" stroke="#0F172A" strokeWidth="2.5" />
        <path
          d="M8 14 L22 10 L26 24 L13 24 Z"
          fill="#2563EB"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 28 Q22 22 29 10"
          fill="none"
          stroke="#67E8F9"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <rect x="17" y="16" width="7" height="3" fill="#67E8F9" />
      </svg>
    );
  }

  if (id === 'titan') {
    return (
      <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#78350F" stroke="#0F172A" strokeWidth="2.5" />
        <path
          d="M9 14 L7 7 L13 12 H23 L29 7 L27 14 L26 26 H10 Z"
          fill="#475569"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <rect x="12" y="17" width="12" height="4" fill="#FEF08A" stroke="#0F172A" strokeWidth="1.2" />
      </svg>
    );
  }

  if (id === 'volt') {
    return (
      <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
        <circle cx="18" cy="18" r="16" fill="#4C1D95" stroke="#0F172A" strokeWidth="2.5" />
        {/* Crackling lightning bolt */}
        <path
          d="M20 5 L9 18 L16 18 L13 31 L26 15 L19 15 Z"
          fill="#FACC15"
          stroke="#0F172A"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        {/* Glow spark */}
        <polygon points="17,16 19,13 21,16 19,19" fill="#FFFFFF" />
      </svg>
    );
  }

  // frost
  return (
    <svg viewBox="0 0 36 36" className={className} aria-hidden="true">
      <circle cx="18" cy="18" r="16" fill="#164E63" stroke="#0F172A" strokeWidth="2.5" />
      {/* 6-point crystal diamond star */}
      <path
        d="M18 6 L21 14 L29 11 L23 18 L29 25 L21 22 L18 30 L15 22 L7 25 L13 18 L7 11 L15 14 Z"
        fill="#06B6D4"
        stroke="#0F172A"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Inner ice core */}
      <polygon points="18,12 22,18 18,24 14,18" fill="#E0F2FE" stroke="#0891B2" strokeWidth="1" />
    </svg>
  );
}
