
(() => {
  'use strict';

  const API = 'https://api.vinkasar.my.id';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];

  let editingVideo = null;
  let editingJournal = null;
  let videoCache = [];
  let journalCache = [];

  const categories = [
    'Travel Stories',
    'Personal Journey',
    'Modeling Experiences',
    'Beauty and Bridal Makeup',
    'Communication Studies',
    'Creative Diary'
  ];

  const settingsFields = [
    ['site_title','Nama Website','text'],
    ['owner_name','Nama Pemilik','text'],
    ['tagline','Tagline','text'],
    ['hero_intro','Perkenalan Hero','textarea'],
    ['hero_image','Foto Hero','image'],
    ['about_heading','Judul About Me','text'],
    ['about_paragraph_1','Paragraf About Me 1','textarea'],
    ['about_paragraph_2','Paragraf About Me 2','textarea'],
    ['about_image','Foto About Me','image'],
    ['portfolio_intro','Deskripsi Portfolio','textarea'],
    ['travel_image','Foto Traveling','image'],
    ['modeling_image','Foto Modeling','image'],
    ['bridal_image','Foto Bridal Makeup','image'],
    ['behind_the_scenes','Behind the Scenes','textarea'],
    ['goals_intro','Deskripsi My Goals','textarea'],
    ['quote','Quote Website','textarea'],
    ['instagram_url','Link Instagram','text'],
    ['instagram_username','Username Instagram','text'],
    ['video_default_image','Thumbnail Video Default','image'],
    ['journal_default_image','Sampul Jurnal Default','image']
  ];

  async function api(path, options = {}) {
    const opts = {
      ...options,
      credentials: 'include',
      headers: { ...(options.headers || {}) }
    };

    if (opts.body && !(opts.body instanceof FormData)) {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(opts.body);
    }

    const res = await fetch(API + path, opts);
    const data = await res.json().catch(() => ({
      error: 'Respons server tidak valid.'
    }));

    if (!res.ok) {
      if (res.status === 401 && path.startsWith('/admin/')) showLogin();
      throw new Error(data.error || `Permintaan gagal (${res.status})`);
    }

    return data;
  }

  function toast(message, error = false) {
    const el = $('#toast');
    el.textContent = message;
    el.style.background = error ? '#8c443d' : '#24231f';
    el.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  function loginNotice(message = '') {
    $('#login-notice').textContent = message;
  }

  function showLogin() {
    $('#admin-app').classList.add('hidden');
    $('#login-shell').classList.remove('hidden');
    $('#login-form').classList.remove('hidden');
    $('#login-title').innerHTML = 'Welcome <em>back.</em>';
    $('#login-desc').textContent = 'Masuk untuk mengelola website MY LITTLE JOURNEY.';
  }

  function showApp(user) {
    $('#login-shell').classList.add('hidden');
    $('#admin-app').classList.remove('hidden');
    $('#admin-username').textContent = user?.username || 'Administrator';
    loadOverview();
  }

  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();

    const btn = $('button[type=submit]', e.currentTarget);
    btn.disabled = true;
    loginNotice('Memeriksa username dan password…');

    try {
      const f = new FormData(e.currentTarget);
      const d = await api('/auth/login', {
        method: 'POST',
        body: {
          username: f.get('username'),
          password: f.get('password')
        }
      });

      showApp(d.user);
    } catch (err) {
      loginNotice(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $('#logout-btn').addEventListener('click', async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    showLogin();
  });

  function switchView(name) {
    $$('.view').forEach(x => x.classList.add('hidden'));
    $(`#view-${name}`).classList.remove('hidden');

    $$('.nav-item').forEach(x => {
      x.classList.toggle('active', x.dataset.view === name);
    });

    const title = {
      overview: 'Overview',
      settings: 'Website Settings',
      videos: 'Video Manager',
      journals: 'Journal Manager',
      account: 'Account Settings'
    }[name];

    $('#page-title').textContent = title;
    $('#sidebar').classList.remove('open');

    if (name === 'settings') loadSettings();
    if (name === 'videos') loadVideos();
    if (name === 'journals') loadJournals();
  }

  $$('.nav-item').forEach(b => {
    b.addEventListener('click', () => switchView(b.dataset.view));
  });

  $$('[data-goto]').forEach(b => {
    b.addEventListener('click', () => switchView(b.dataset.goto));
  });

  $('#mobile-menu').addEventListener('click', () => {
    $('#sidebar').classList.toggle('open');
  });

  async function loadOverview() {
    try {
      const [v, j] = await Promise.all([
        api('/admin/content?kind=videos'),
        api('/admin/content?kind=journals')
      ]);

      videoCache = v.items || [];
      journalCache = j.items || [];

      const all = [...videoCache, ...journalCache];

      $('#stat-videos').textContent = videoCache.length;
      $('#stat-journals').textContent = journalCache.length;
      $('#stat-published').textContent =
        all.filter(x => x.status === 'published').length;
    } catch (e) {
      toast(e.message, true);
    }
  }

  function fieldHtml(name, label, type, value = '', full = false, options = []) {
    const cls = full ? 'field full' : 'field';
    const val = esc(value ?? '');

    if (type === 'textarea') {
      return `<label class="${cls}">${label}<textarea name="${name}">${val}</textarea></label>`;
    }

    if (type === 'select') {
      return `<label class="${cls}">${label}<select name="${name}">${options.map(o => `<option ${o === value ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
    }

    if (type === 'image') {
      return `<div class="${cls}"><span>${label}</span><div class="image-field"><img class="preview" src="${val || '/media/images/journal-placeholder.svg'}" alt="Preview"><div class="upload-controls"><input type="hidden" name="${name}" value="${val}"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" data-upload-for="${name}"><small class="field-hint">${name === 'cover' ? 'Thumbnail disarankan 1280 × 720 px (rasio 16:9), JPG/PNG/WebP, maksimal 8 MB. Crop otomatis 16:9 tersedia.' : 'JPG, PNG, WebP, GIF · Maksimal 8 MB. Foto dapat di-crop sebelum diunggah.'}</small></div></div></div>`;
    }

    return `<label class="${cls}">${label}<input name="${name}" type="${type}" value="${val}"></label>`;
  }

  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[c]);
  }

  async function loadSettings() {
    try {
      const d = await api('/admin/content?kind=settings');
      $('#settings-fields').innerHTML = settingsFields
        .map(([n, l, t]) => fieldHtml(n, l, t, d.settings?.[n] || '', t === 'textarea'))
        .join('');
      bindUploads($('#settings-fields'));
    } catch (e) {
      toast(e.message, true);
    }
  }

  let cropState = null;

  function cropAspectForField(name) {
    if (name === 'hero_image' || name === 'about_image') return '4:5';
    if (name === 'travel_image' || name === 'modeling_image' || name === 'bridal_image') return '3:2';
    if (name === 'cover') return '16:9';
    return '4:5';
  }

  function ensureCropModal() {
    if ($('#crop-modal')) return;
    const modal = document.createElement('div');
    modal.id = 'crop-modal';
    modal.className = 'crop-modal hidden';
    modal.innerHTML = `
      <section class="crop-dialog" role="dialog" aria-modal="true" aria-labelledby="crop-title">
        <header class="crop-head"><div><p class="eyebrow">IMAGE EDITOR</p><h2 id="crop-title">Sesuaikan foto</h2><p class="crop-subtitle">Geser foto untuk mengatur posisi, lalu pilih rasio yang sesuai.</p></div><button type="button" class="icon-btn" id="crop-close" aria-label="Tutup">✕</button></header>
        <div class="crop-stage"><canvas id="crop-canvas" width="960" height="600"></canvas><span class="crop-hint">Geser foto untuk mengatur area potong</span></div>
        <div class="crop-controls">
          <label>Rasio foto<select id="crop-ratio"><option value="4:5">4:5 · Portrait</option><option value="3:2">3:2 · Landscape</option><option value="16:9">16:9 · Wide</option><option value="1:1">1:1 · Square</option><option value="original">Asli · Original</option></select></label>
          <label class="zoom-control">Zoom <input id="crop-zoom" type="range" min="1" max="3" step="0.01" value="1"><output id="crop-zoom-value">100%</output></label>
        </div>
        <footer class="crop-actions"><button type="button" class="btn btn-light" id="crop-cancel">Batal</button><button type="button" class="btn btn-dark" id="crop-apply">Potong & Upload ↗</button></footer>
      </section>`;
    document.body.appendChild(modal);
    $('#crop-close').addEventListener('click', closeCrop);
    $('#crop-cancel').addEventListener('click', closeCrop);
    $('#crop-ratio').addEventListener('change', () => {
      if (!cropState) return;
      setCropAspect($('#crop-ratio').value);
      drawCrop();
    });
    $('#crop-zoom').addEventListener('input', () => {
      if (!cropState) return;
      cropState.zoom = Number($('#crop-zoom').value);
      clampCropCenter(); drawCrop();
      $('#crop-zoom-value').value = `${Math.round(cropState.zoom * 100)}%`;
      $('#crop-zoom-value').textContent = `${Math.round(cropState.zoom * 100)}%`;
    });
    $('#crop-apply').addEventListener('click', uploadCroppedImage);
    const canvas = $('#crop-canvas');
    canvas.addEventListener('pointerdown', e => {
      if (!cropState) return;
      cropState.dragging = true;
      cropState.lastX = e.clientX; cropState.lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', e => {
      if (!cropState?.dragging) return;
      const rect = canvas.getBoundingClientRect();
      const dx = (e.clientX - cropState.lastX) * (canvas.width / rect.width);
      const dy = (e.clientY - cropState.lastY) * (canvas.height / rect.height);
      cropState.lastX = e.clientX; cropState.lastY = e.clientY;
      cropState.centerX -= dx * cropState.cropW / canvas.width;
      cropState.centerY -= dy * cropState.cropH / canvas.height;
      clampCropCenter(); drawCrop();
    });
    const stop = () => { if (cropState) cropState.dragging = false; };
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    modal.addEventListener('click', e => { if (e.target === modal) closeCrop(); });
  }

  function setCropAspect(value) {
    const image = cropState.image;
    const aspect = value === 'original' ? image.naturalWidth / image.naturalHeight : value.split(':').map(Number).reduce((a,b) => a / b);
    cropState.aspect = aspect;
    const maxW = Math.min(image.naturalWidth, image.naturalHeight * aspect);
    cropState.baseW = maxW;
    cropState.baseH = maxW / aspect;
    cropState.centerX = image.naturalWidth / 2;
    cropState.centerY = image.naturalHeight / 2;
    cropState.zoom = 1;
    $('#crop-zoom').value = '1';
    $('#crop-zoom-value').textContent = '100%';
    const canvas = $('#crop-canvas');
    canvas.width = 960;
    canvas.height = Math.round(960 / aspect);
    if (canvas.height > 680) { canvas.height = 680; canvas.width = Math.round(680 * aspect); }
    cropState.cropW = cropState.baseW;
    cropState.cropH = cropState.baseH;
    clampCropCenter();
  }

  function clampCropCenter() {
    const s = cropState;
    s.cropW = s.baseW / s.zoom;
    s.cropH = s.baseH / s.zoom;
    s.centerX = Math.max(s.cropW / 2, Math.min(s.image.naturalWidth - s.cropW / 2, s.centerX));
    s.centerY = Math.max(s.cropH / 2, Math.min(s.image.naturalHeight - s.cropH / 2, s.centerY));
  }

  function drawCrop() {
    const s = cropState;
    if (!s) return;
    const canvas = $('#crop-canvas');
    const ctx = canvas.getContext('2d');
    const sx = s.centerX - s.cropW / 2;
    const sy = s.centerY - s.cropH / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#f1eee8'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(s.image, sx, sy, s.cropW, s.cropH, 0, 0, canvas.width, canvas.height);
  }

  function closeCrop() {
    $('#crop-modal')?.classList.add('hidden');
    if (cropState?.input) { cropState.input.disabled = false; cropState.input.value = ''; }
    cropState = null;
  }

  async function uploadCroppedImage() {
    if (!cropState) return;
    const s = cropState;
    const button = $('#crop-apply');
    button.disabled = true; button.textContent = 'Mengunggah foto…';
    try {
      const out = document.createElement('canvas');
      const maxWidth = Math.min(2200, Math.round(s.cropW));
      out.width = maxWidth;
      out.height = Math.round(maxWidth / s.aspect);
      out.getContext('2d').drawImage(s.image,
        s.centerX - s.cropW / 2, s.centerY - s.cropH / 2, s.cropW, s.cropH,
        0, 0, out.width, out.height);
      const blob = await new Promise((resolve, reject) => out.toBlob(b => b ? resolve(b) : reject(new Error('Gagal memproses foto.')), 'image/jpeg', .9));
      const file = new File([blob], `${(s.originalName || 'photo').replace(/\.[^.]+$/, '')}-cropped.jpg`, { type: 'image/jpeg' });
      const fd = new FormData(); fd.append('file', file);
      const d = await api('/admin/upload', { method: 'POST', body: fd });
      const row = s.input.closest('.image-field');
      const hidden = $(`input[type=hidden][name="${s.input.dataset.uploadFor}"]`, s.input.closest('.field'));
      hidden.value = d.url;
      $('.preview', row).src = d.url;
      closeCrop();
      toast('Foto berhasil dipotong dan diunggah. Simpan form untuk menerapkan perubahan.');
    } catch (e) {
      toast(e.message || 'Gagal mengunggah foto.', true);
    } finally {
      button.disabled = false; button.textContent = 'Potong & Upload ↗';
      if (cropState) s.input.disabled = false;
    }
  }

  async function uploadFile(input) {
    const file = input.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Pilih file gambar terlebih dahulu.', true); input.value = ''; return; }
    if (file.size > 8 * 1024 * 1024) { toast('Ukuran gambar maksimal 8 MB.', true); input.value = ''; return; }
    ensureCropModal();
    input.disabled = true;
    try {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.src = objectUrl;
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Foto tidak dapat dibuka.')); });
      cropState = { input, image, originalName: file.name, dragging: false };
      $('#crop-ratio').value = cropAspectForField(input.dataset.uploadFor);
      setCropAspect($('#crop-ratio').value);
      drawCrop();
      $('#crop-modal').classList.remove('hidden');
      URL.revokeObjectURL(objectUrl);
    } catch (e) {
      input.disabled = false; input.value = '';
      toast(e.message || 'Gagal membuka foto.', true);
    }
  }

  function bindUploads(root) {
    $$('[data-upload-for]', root).forEach(i => {
      i.addEventListener('change', () => uploadFile(i));
    });
  }

  $('#settings-form').addEventListener('submit', async e => {
    e.preventDefault();

    const content = {};
    settingsFields.forEach(([n]) => {
      const el = $(`[name="${n}"]`, e.currentTarget);
      content[n] = el?.value || '';
    });

    try {
      const d = await api('/admin/content', {
        method: 'POST',
        body: { kind: 'settings', action: 'save', content }
      });
      toast(d.message);
    } catch (err) {
      toast(err.message, true);
    }
  });

  function renderList(root, items, kind) {
    if (!items.length) {
      root.innerHTML = '<div class="empty">Belum ada konten. Klik tombol tambah untuk membuat konten pertama.</div>';
      return;
    }

    root.innerHTML = items.map(x => `
      <article class="content-row">
        <img src="${esc(x.cover || x.hero_image || '/media/images/journal-placeholder.svg')}" alt="">
        <div>
          <h4>${esc(x.title || x.site_title || 'Website Settings')}</h4>
          <p>${esc(x.category || 'Website')} · ${esc(x.date || '')} · <strong>${esc(x.status || 'active')}</strong></p>
        </div>
        <div class="row-actions">
          <button data-edit="${esc(x.slug || '')}" data-kind="${kind}">Edit</button>
          ${kind !== 'settings' ? `<button class="delete" data-delete="${esc(x.slug || '')}" data-kind="${kind}">Hapus</button>` : ''}
        </div>
      </article>
    `).join('');

    $$('[data-edit]', root).forEach(b => {
      b.addEventListener('click', () => {
        kind === 'videos'
          ? openVideo(items.find(x => x.slug === b.dataset.edit))
          : openJournal(items.find(x => x.slug === b.dataset.edit));
      });
    });

    $$('[data-delete]', root).forEach(b => {
      b.addEventListener('click', () => deleteContent(kind, b.dataset.delete));
    });
  }

  async function loadVideos() {
    try {
      const d = await api('/admin/content?kind=videos');
      videoCache = d.items || [];
      renderList($('#videos-list'), videoCache, 'videos');
    } catch (e) {
      toast(e.message, true);
    }
  }

  async function loadJournals() {
    try {
      const d = await api('/admin/content?kind=journals');
      journalCache = d.items || [];
      renderList($('#journals-list'), journalCache, 'journals');
    } catch (e) {
      toast(e.message, true);
    }
  }

  function videoForm(item = {}) {
    const legacyUrl = item.video_url || item.youtube_url || '';
    const inferredPlatform = item.platform || (String(legacyUrl).includes('tiktok.com') ? 'tiktok' : 'youtube');
    const f = [
      ['title','Judul Video','text'],
      ['slug','URL Slug','text'],
      ['description','Deskripsi','textarea'],
      ['platform','Platform Video','select'],
      ['video_url','Link Video','url'],
      ['category','Kategori','select'],
      ['date','Tanggal Publikasi','date'],
      ['cover','Thumbnail Video','image'],
      ['status','Status','select']
    ];

    const values = {
      ...item,
      platform: inferredPlatform,
      video_url: legacyUrl
    };

    $('#video-fields').innerHTML = `
      <div class="video-source-note field full">
        <strong>Thumbnail otomatis</strong>
        <span>YouTube: thumbnail diambil otomatis. TikTok: thumbnail dicoba melalui layanan oEmbed. Anda tetap bisa menggantinya dengan upload sendiri.</span>
      </div>
      ${f.map(([n, l, t]) =>
        fieldHtml(n, l, t, values[n] || (n === 'date' ? new Date().toISOString().slice(0, 10) : n === 'status' ? 'draft' : n === 'platform' ? 'youtube' : ''), t === 'textarea', n === 'category' ? categories : n === 'status' ? ['draft', 'published'] : n === 'platform' ? ['youtube', 'tiktok'] : [])
      ).join('')}
      <div class="video-auto-preview field full" id="video-auto-preview" aria-live="polite">
        <span>Pratinjau thumbnail otomatis akan muncul setelah link video diisi.</span>
      </div>
    `;

    bindUploads($('#video-fields'));

    const platform = $('[name="platform"]', $('#video-fields'));
    const urlInput = $('[name="video_url"]', $('#video-fields'));
    const coverInput = $('[name="cover"]', $('#video-fields'));
    const preview = $('#video-auto-preview');
    let lastAutoCover = item.auto_cover || '';
    let previewTimer;

    const updateAutoPreview = async () => {
      const p = platform.value;
      const url = urlInput.value.trim();
      if (!url) {
        preview.innerHTML = '<span>Masukkan link YouTube atau TikTok untuk mengambil thumbnail otomatis.</span>';
        return;
      }

      let thumb = '';
      let resolvedUrl = url;

      if (p === 'youtube') {
        const id = getYouTubeId(url);
        if (!id) {
          preview.innerHTML = '<span>Link YouTube belum valid. Gunakan link video, Shorts, atau youtu.be.</span>';
          return;
        }
        thumb = `https://img.youtube.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
      } else {
        preview.innerHTML = '<span>Mengambil thumbnail TikTok…</span>';
        try {
          const result = await api(`/admin/video-preview?platform=tiktok&url=${encodeURIComponent(url)}`);
          thumb = result.thumbnail || '';
          resolvedUrl = result.canonical_url || url;
        } catch (error) {
          preview.innerHTML = `<span>Thumbnail TikTok otomatis belum tersedia. Anda bisa upload thumbnail sendiri. (${esc(error.message)})</span>`;
          return;
        }
      }

      if (!thumb) {
        preview.innerHTML = '<span>Thumbnail otomatis tidak tersedia. Silakan upload thumbnail sendiri.</span>';
        return;
      }

      if (p === 'tiktok' && resolvedUrl && resolvedUrl !== url) {
        urlInput.value = resolvedUrl;
      }

      preview.innerHTML = `<img src="${esc(thumb)}" alt="Pratinjau thumbnail otomatis"><span>Thumbnail otomatis ditemukan. Upload thumbnail sendiri jika ingin menggantinya.</span>`;
      const currentCover = coverInput.value.trim();
      if (!currentCover || currentCover === lastAutoCover) {
        coverInput.value = thumb;
        const imagePreview = $('.preview', coverInput.closest('.field'));
        if (imagePreview) imagePreview.src = thumb;
        lastAutoCover = thumb;
      }
      values.video_url = resolvedUrl;
    };

    platform.addEventListener('change', updateAutoPreview);
    urlInput.addEventListener('input', () => {
      clearTimeout(previewTimer);
      previewTimer = setTimeout(updateAutoPreview, 650);
    });
    if (legacyUrl) updateAutoPreview();
  }

  function getYouTubeId(value) {
    try {
      const url = new URL(value);
      if (url.hostname === 'youtu.be' || url.hostname.endsWith('.youtu.be')) return url.pathname.split('/').filter(Boolean)[0] || '';
      if (url.searchParams.get('v')) return url.searchParams.get('v');
      const parts = url.pathname.split('/').filter(Boolean);
      const marker = parts.findIndex(x => ['embed', 'shorts', 'live'].includes(x));
      return marker >= 0 ? (parts[marker + 1] || '') : '';
    } catch {
      return '';
    }
  }

  function journalForm(item = {}) {
    const f = [
      ['title','Judul Artikel','text'],
      ['slug','URL Slug','text'],
      ['date','Tanggal Publikasi','date'],
      ['category','Kategori','select'],
      ['excerpt','Ringkasan Artikel','textarea'],
      ['cover','Foto Sampul','image'],
      ['body','Isi Artikel (teks/Markdown)','textarea'],
      ['status','Status','select']
    ];

    $('#journal-fields').innerHTML = f.map(([n, l, t]) =>
      fieldHtml(n, l, t, item[n] || (n === 'date' ? new Date().toISOString().slice(0, 10) : n === 'status' ? 'draft' : ''), n === 'body' || n === 'excerpt', n === 'category' ? categories : n === 'status' ? ['draft', 'published'] : [])
    ).join('');

    bindUploads($('#journal-fields'));
  }

  function openVideo(item) {
    editingVideo = item || null;
    $('#video-form-title').textContent = item ? 'Edit Video' : 'Tambah Video';
    videoForm(item || {});
    $('#video-editor').classList.remove('hidden');
    $('#video-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function openJournal(item) {
    editingJournal = item || null;
    $('#journal-form-title').textContent = item ? 'Edit Jurnal' : 'Tulis Jurnal';
    journalForm(item || {});
    $('#journal-editor').classList.remove('hidden');
    $('#journal-editor').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  $('#new-video').addEventListener('click', () => openVideo());
  $('#new-journal').addEventListener('click', () => openJournal());
  $('#refresh-videos').addEventListener('click', loadVideos);
  $('#refresh-journals').addEventListener('click', loadJournals);

  $$('[data-close]').forEach(b => {
    b.addEventListener('click', () => $('#' + b.dataset.close).classList.add('hidden'));
  });

  function formObject(form, fields) {
    const o = {};
    fields.forEach(n => o[n] = $(`[name="${n}"]`, form)?.value || '');
    return o;
  }

  $('#video-editor').addEventListener('submit', async e => {
    e.preventDefault();

    const c = formObject(e.currentTarget, [
      'title','slug','description','platform','video_url','category','date','cover','status'
    ]);
    c.youtube_url = c.platform === 'youtube' ? c.video_url : '';
    c.created_at = editingVideo?.created_at || new Date().toISOString();
    c.updated_at = new Date().toISOString();

    try {
      const d = await api('/admin/content', {
        method: 'POST',
        body: {
          kind: 'videos',
          action: 'save',
          content: c,
          originalSlug: editingVideo?.slug || ''
        }
      });

      toast(d.message);
      $('#video-editor').classList.add('hidden');
      await loadVideos();
    } catch (err) {
      toast(err.message, true);
    }
  });

  $('#journal-editor').addEventListener('submit', async e => {
    e.preventDefault();

    const c = formObject(e.currentTarget, [
      'title','slug','date','category','excerpt','cover','body','status'
    ]);

    try {
      const d = await api('/admin/content', {
        method: 'POST',
        body: {
          kind: 'journals',
          action: 'save',
          content: c,
          originalSlug: editingJournal?.slug || ''
        }
      });

      toast(d.message);
      $('#journal-editor').classList.add('hidden');
      await loadJournals();
    } catch (err) {
      toast(err.message, true);
    }
  });

  async function deleteContent(kind, slug) {
    if (!confirm(`Hapus konten "${slug}"? Tindakan ini akan menghapus file konten dari repository.`)) return;

    try {
      const d = await api('/admin/content', {
        method: 'POST',
        body: { kind, action: 'delete', slug }
      });

      toast(d.message);
      kind === 'videos' ? loadVideos() : loadJournals();
    } catch (e) {
      toast(e.message, true);
    }
  }

  $('#password-form').addEventListener('submit', async e => {
    e.preventDefault();

    const f = new FormData(e.currentTarget);

    try {
      const d = await api('/admin/account', {
        method: 'POST',
        body: {
          action: 'password',
          currentPassword: f.get('currentPassword'),
          newPassword: f.get('newPassword')
        }
      });

      toast(d.message);
      showLogin();
    } catch (err) {
      toast(err.message, true);
    }
  });

  async function boot() {
    try {
      const d = await api('/admin/me');
      showApp(d.user);
    } catch {
      showLogin();
    }
  }

  boot();
})();
