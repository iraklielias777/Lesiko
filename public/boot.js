// Runs before the module bundle. Lives here rather than inline in index.html
// so the Content-Security-Policy can forbid inline scripts outright.

// Process shim: prevents crashes in libraries expecting a Node-like environment.
window.process = { env: { NODE_ENV: 'production' } };

// The app moved off HashRouter. Links shared while it was live still carry the
// fragment, so rewrite them to the real path before React boots.
if (location.hash.indexOf('#/') === 0) {
  var target = location.hash.slice(1);
  history.replaceState(null, '', target.indexOf('?') === -1 ? target + location.search : target);
}

// Boot splash safety net: the app lifts it when the page is ready; if the app
// never gets there, nobody should stare at a logo for longer than this.
function liftSplash() {
  var splash = document.getElementById('splash');
  if (splash) splash.classList.add('is-done');
}
setTimeout(liftSplash, 8000);

// Global error catcher: shows errors on screen if the app fails to mount.
window.onerror = function (msg) {
  liftSplash();
  var root = document.getElementById('root');
  if (root && !root.innerHTML.trim()) {
    root.innerHTML =
      '<div style="padding: 20px; font-family: sans-serif; text-align: center;">' +
      '<h2>Application Error</h2>' +
      '<p style="color: #666;">' + msg + '</p>' +
      '<button onclick="location.reload()" style="padding: 10px 20px; background: #AED136; border: none; border-radius: 5px; color: white; cursor: pointer;">Retry</button>' +
      '</div>';
  }
  return false;
};
