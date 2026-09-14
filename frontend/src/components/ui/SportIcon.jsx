import React from 'react';
import {
  Trophy,
  Activity,
  Flame,
  CircleDot,
  Dumbbell,
  Target
} from 'lucide-react';

/**
 * QuickCourt Contextual Sports Icons
 * Standardized 1.5px stroke athletic iconography
 */
export default function SportIcon({
  sport,
  className = 'w-5 h-5',
  strokeWidth = 1.5,
  ...props
}) {
  const normSport = (sport || '').toLowerCase().trim();

  // Custom SVGs for sports where Lucide doesn't have a dedicated racquet/cricket icon
  if (normSport.includes('cricket') || normSport.includes('box cricket')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {/* Cricket bat & ball */}
        <path d="M5 19L17 7l2 2L7 21l-3-1 1-1z" />
        <path d="M16 6l2-2 2 2-2 2" />
        <circle cx="18" cy="18" r="2.5" />
      </svg>
    );
  }

  if (normSport.includes('badminton')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {/* Badminton shuttlecock / racquet */}
        <path d="M12 4c-3.3 0-6 2.7-6 6 0 2.2 1.2 4.1 3 5.1V21l3-1.5 3 1.5v-5.9c1.8-1 3-2.9 3-5.1 0-3.3-2.7-6-6-6z" />
        <path d="M12 4v11" />
        <path d="M8 9h8" />
      </svg>
    );
  }

  if (normSport.includes('tennis') || normSport.includes('padel') || normSport.includes('pickleball')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {/* Tennis / Padel racquet */}
        <ellipse cx="15" cy="9" rx="6" ry="6" />
        <path d="M10.5 13.5L4 20l-1-1 6.5-6.5" />
        <path d="M12 6c1 2 2 4 3 6" />
        <path d="M9 9c2 1 4 2 6 3" />
      </svg>
    );
  }

  if (normSport.includes('football') || normSport.includes('soccer') || normSport.includes('turf')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        {/* Football */}
        <circle cx="12" cy="12" r="9" />
        <polygon points="12,7 16,10 14.5,15 9.5,15 8,10" />
        <line x1="12" y1="7" x2="12" y2="3" />
        <line x1="16" y1="10" x2="20" y2="8" />
        <line x1="14.5" y1="15" x2="18" y2="19" />
        <line x1="9.5" y1="15" x2="6" y2="19" />
        <line x1="8" y1="10" x2="4" y2="8" />
      </svg>
    );
  }

  if (normSport.includes('basketball')) {
    return (
      <svg
        className={className}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...props}
      >
        <circle cx="12" cy="12" r="9" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <path d="M5.5 5.5c4 3 4 10 0 13" />
        <path d="M18.5 5.5c-4 3-4 10 0 13" />
      </svg>
    );
  }

  // Fallback
  return <Target className={className} strokeWidth={strokeWidth} {...props} />;
}
