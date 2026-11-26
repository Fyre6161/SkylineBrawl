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
