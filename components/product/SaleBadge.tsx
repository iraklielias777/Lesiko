import React from 'react';

/**
 * The red "−26%" pill. One component so the card, the product page gallery and
 * anywhere else that advertises a discount look identical.
 */
export const SaleBadge: React.FC<{ percent: number; className?: string }> = ({ percent, className = '' }) =>
  percent > 0 ? (
    <span
      className={`bg-red-500/90 backdrop-blur-sm text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm shadow-sm ${className}`}
    >
      -{percent}%
    </span>
  ) : null;
