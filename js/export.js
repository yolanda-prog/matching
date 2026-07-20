(function (global) {
  'use strict';

  function encodeActivity(activity) {
    const bytes = new TextEncoder().encode(JSON.stringify(activity));
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeName(title, extension) {
    const base = (title || 'matching-activity')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'matching-activity';
    return base + extension;
  }

  async function fetchText(path) {
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load ${path}`);
    return response.text();
  }

  async function standalone(activity) {
    const [sharedCss, playerCss, engineJs, playerJs] = await Promise.all([
      fetchText('css/shared.css'),
      fetchText('css/player.css'),
      fetchText('js/matching-engine.js'),
      fetchText('js/player.js')
    ]);
    const data = JSON.stringify(activity).replace(/</g, '\\u003c');
    const safeTitle = String(activity.title || 'Matching Activity').replace(/[<>&]/g, '');
    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Interactive matching activity">
  <title>${safeTitle}</title>
  <style>${sharedCss}\n${playerCss}</style>
</head>
<body>
  <main class="page-shell">
    <div id="activityRoot" class="activity-card" aria-live="polite"></div>
  </main>
  <script>window.__EXPORTED_ACTIVITY__=${data};<\/script>
  <script>${engineJs}<\/script>
  <script>${playerJs.replace('const activity = decodeActivityFromHash() || DEFAULT_ACTIVITY;', 'const activity = window.__EXPORTED_ACTIVITY__ || decodeActivityFromHash() || DEFAULT_ACTIVITY;')}<\/script>
</body>
</html>`;
  }

  global.MatchingExport = {
    downloadJson(activity) {
      download(safeName(activity.title, '.json'), JSON.stringify(activity, null, 2), 'application/json');
    },
    async downloadHtml(activity) {
      const html = await standalone(activity);
      download(safeName(activity.title, '.html'), html, 'text/html');
    },
    shareUrl(activity) {
      const base = new URL('index.html', location.href);
      base.hash = `activity=${encodeActivity(activity)}`;
      return base.href;
    },
    standalone
  };
}(window));
