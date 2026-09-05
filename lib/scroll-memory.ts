/**
 * Where you were on a listing when you opened a product. The browser's own
 * restoration fires before the results have loaded, when the page is still a
 * short skeleton, so it lands at the top; this remembers the offset per
 * history entry and puts it back once the results are in.
 */
const KEY = 'lesiko-scroll';

const read = (): Record<string, number> => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '{}');
  } catch {
    return {};
  }
};

export const rememberScroll = (entryKey: string) => {
  try {
    const all = read();
    all[entryKey] = window.scrollY;
    const keys = Object.keys(all);
    // Keep the last few entries only; nobody goes back further than that.
    for (const stale of keys.slice(0, Math.max(0, keys.length - 20))) delete all[stale];
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
};

export const recallScroll = (entryKey: string): number | undefined => read()[entryKey];

/**
 * Scrolls to `y` as soon as the document is tall enough to get there, trying
 * for a couple of seconds while results load. Gives up quietly otherwise.
 */
export const restoreScrollWhenReady = (y: number) => {
  const delays = [0, 100, 250, 500, 800, 1200, 1800, 2500];
  let done = false;
  const attempt = () => {
    if (done) return;
    const reachable = document.documentElement.scrollHeight - window.innerHeight;
    if (reachable >= y - 4) {
      done = true;
      window.scrollTo({ top: y, behavior: 'auto' });
    }
  };
  for (const delay of delays) window.setTimeout(attempt, delay);
};
