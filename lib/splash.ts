/**
 * The boot splash lives in index.html so it is on screen from the first paint,
 * before any JavaScript has run. The app lifts it once there is a complete
 * page to show: the homepage waits for the hero image to decode (lib/hero.ts),
 * every other route lifts it as soon as its component has mounted, and
 * public/boot.js removes it regardless after a hard cap.
 */
const SPLASH_ID = 'splash';

let dismissed = false;

export const dismissSplash = () => {
  if (dismissed || typeof document === 'undefined') return;
  dismissed = true;
  const el = document.getElementById(SPLASH_ID);
  if (!el) return;
  el.classList.add('is-done');
  // Left on <html> so a load can be checked from the console: when, in ms
  // since navigation, the page was declared complete.
  document.documentElement.dataset.splashDoneAt = String(Math.round(performance.now()));
  window.setTimeout(() => el.remove(), 450);
};
