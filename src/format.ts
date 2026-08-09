/** Compact money for card surfaces: $21.0M, $840K, $4K. */
export const money = (usd: number): string => {
  if (usd >= 1_000_000) {
    const m = usd / 1_000_000;
    return `$${m >= 100 ? Math.round(m) : m.toFixed(1)}M`;
  }
  if (usd >= 1_000) return `$${Math.round(usd / 1_000)}K`;
  return `$${usd}`;
};

/** "today" / "3d ago" / "5w ago" / "7mo ago" — precision the eye can use. */
export const ago = (days: number): string => {
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days}d ago`;
  if (days < 60) return `${Math.round(days / 7)}w ago`;
  return `${Math.round(days / 30)}mo ago`;
};

export const agoFromDate = (epochMs: number): string =>
  ago(Math.round((Date.now() - epochMs) / (24 * 60 * 60 * 1000)));
