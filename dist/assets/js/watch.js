(() => {
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);

  function youtubeId(value) {
    try {
      const url = new URL(value);
      if (url.hostname.includes('youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex(part => ['embed', 'shorts', 'live'].includes(part));
      return marker >= 0 ? (parts[marker + 1] || '') : '';
    } catch {
      return '';
    }
  }

  function platformFromUrl(value, fallback = 'youtube') {
    try {
      const host = new URL(value).hostname.toLowerCase();
      if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) return 'tiktok';
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) return 'youtube';
    } catch {}
    return fallback;
  }

  function renderYoutube(video, url, container) {
    const id = youtubeId(url);
    if (!id) {
      container.innerHTML = '<p class="empty-state">Link YouTube tidak valid. Periksa kembali URL video di Admin.</p>';
      return;
    }
    container.innerHTML = `<div class="video-frame video-frame-youtube"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}" title="${esc(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
  }

  function renderTikTok(video, url, container) {
    let videoId = '';
    try {
      const parsed = new URL(url);
      const match = parsed.pathname.match(/\/video\/(\d+)/);
      if (match) videoId = match[1];
    } catch {}

    container.innerHTML = `
      <div class="video-frame video-frame-tiktok">
        <blockquote class="tiktok-embed" cite="${esc(url)}" ${videoId ? `data-video-id="${esc(videoId)}"` : ''} style="max-width:100%;min-width:0;">
          <section><a target="_blank" rel="noopener noreferrer" href="${esc(url)}">Tonton video ini di TikTok</a></section>
        </blockquote>
      </div>
      <p class="video-platform-link"><a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Buka video di TikTok ↗</a></p>
    `;

    const oldScript = document.querySelector('script[data-tiktok-embed]');
    if (oldScript) oldScript.remove();
    const script = document.createElement('script');
    script.src = 'https://www.tiktok.com/embed.js';
    script.async = true;
    script.dataset.tiktokEmbed = 'true';
    document.body.appendChild(script);
  }

  const slug = new URLSearchParams(location.search).get('slug');
  const container = document.getElementById('watch-content');

  fetch('/data/videos.json')
    .then(response => {
      if (!response.ok) throw new Error('Video tidak dapat dimuat.');
      return response.json();
    })
    .then(items => {
      const video = items.find(item => item.slug === slug && item.status === 'published');
      if (!video) {
        container.innerHTML = '<h1>Video tidak ditemukan.</h1><a href="/video.html">← Kembali ke video</a>';
        return;
      }

      const videoUrl = video.video_url || video.youtube_url || '';
      // Always trust the actual URL host over a stale/mistyped platform field.
      const platform = platformFromUrl(videoUrl, video.platform || 'youtube');
      document.title = `${video.title} — MY LITTLE JOURNEY`;

      container.innerHTML = `
        <a class="article-back" href="/video.html">← KEMBALI KE VIDEO</a>
        <p class="eyebrow" style="margin-top:40px">${esc(video.category)} · ${esc(video.date)}</p>
        <h1>${esc(video.title)}</h1>
        <div id="video-player-mount"></div>
        <div class="article-body"><p>${esc(video.description || '')}</p></div>
      `;

      const mount = document.getElementById('video-player-mount');
      if (platform === 'tiktok') renderTikTok(video, videoUrl, mount);
      else renderYoutube(video, videoUrl, mount);
    })
    .catch(() => {
      container.innerHTML = '<p class="empty-state">Video tidak dapat dimuat. Silakan coba lagi.</p>';
    });
})();
