/**
 * The wordmark renders in two tones ("Lesi" + a green "Ko"). Splitting on the
 * inner capital keeps that treatment when the store is renamed from admin,
 * and falls back to a single tone for names without one.
 */
export const splitWordmark = (name: string): [string, string] => {
  const first = (name || '').trim().split(/\s+/)[0] || '';
  const inner = first.slice(1).search(/[A-Z]/);
  return inner === -1 ? [first, ''] : [first.slice(0, inner + 1), first.slice(inner + 1)];
};
