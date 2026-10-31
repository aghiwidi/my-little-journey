const enc = new TextEncoder();
const json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers } });
const b64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const unb64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = (bytes) => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, '0')).join('');
const utf8Base64 = (value) => { const bytes = enc.encode(value); let binary = ''; for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(binary); };
const random = (n = 32) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return a; };
const sha = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
const now = () => Math.floor(Date.now() / 1000);
const cookieName = 'mlj_admin_session';

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = (env.SITE_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  const headers = { 'Vary': 'Origin', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-Bootstrap-Secret', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Max-Age': '86400' };
  if (allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}
function response(request, env, data, status = 200, extra = {}) { return json(data, status, { ...corsHeaders(request, env), ...extra }); }
function cookie(value, maxAge) { return `${cookieName}=${value}; Path=/; Domain=.vinkasar.my.id; HttpOnly; Secure; SameSite=Strict; Max-Age=${maxAge}`; }
function getCookie(request) { return (request.headers.get('Cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1) || ''; }
async function passwordHash(password, salt) {
  const material = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(salt), iterations: 310000, hash: 'SHA-256' }, material, 256);
  return b64(bits);
}
async function rateLimit(env, key, max, seconds) {
  const t = now();
  const row = await env.DB.prepare('SELECT count, window_started FROM rate_limits WHERE bucket=?').bind(key).first();
  if (!row || t - row.window_started >= seconds) {
    await env.DB.prepare('INSERT INTO rate_limits(bucket,count,window_started) VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET count=excluded.count, window_started=excluded.window_started').bind(key, 1, t).run();
    return true;
  }
  if (row.count >= max) return false;
  await env.DB.prepare('UPDATE rate_limits SET count=count+1 WHERE bucket=?').bind(key).run();
  return true;
}
async function sendOtp(env, email, code) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) throw new Error('Resend belum dikonfigurasi: RESEND_API_KEY dan RESEND_FROM wajib diatur.');
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: env.RESEND_FROM, to: [email], subject: 'Kode verifikasi MY LITTLE JOURNEY', html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#222"><p>MY LITTLE JOURNEY · ADMIN</p><h2>Kode verifikasi kamu</h2><p style="font-size:32px;letter-spacing:8px;font-weight:bold">${code}</p><p>Kode berlaku selama 5 menit. Jangan bagikan kode ini kepada siapa pun.</p><p>Jika kamu tidak meminta kode ini, abaikan email ini.</p></div>` }) });
  if (!r.ok) throw new Error(`Resend gagal mengirim email (${r.status}). Periksa domain pengirim dan API key.`);
}
async function requireSession(request, env) {
  const raw = getCookie(request);
  if (!raw) return null;
  const tokenHash = await sha(raw);
  const row = await env.DB.prepare('SELECT s.user_id,u.username,u.email FROM admin_sessions s JOIN admin_users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').bind(tokenHash, now()).first();
  return row || null;
}
async function githubRequest(env, path, init = {}) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO || env.GITHUB_OWNER.startsWith('REPLACE_')) throw new Error('Konfigurasi GitHub belum lengkap. Atur GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.');
  const url = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
  const r = await fetch(url, { ...init, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${env.GITHUB_TOKEN}`, 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'my-little-journey-admin', ...(init.headers || {}) } });
  if (!r.ok) { const msg = await r.text(); throw new Error(`GitHub API ${r.status}: ${msg.slice(0, 300)}`); }
  return r.status === 204 ? null : r.json();
}
async function readGithubFile(env, path) {
  try { const x = await githubRequest(env, path); return { content: JSON.parse(new TextDecoder().decode(unb64(x.content.replace(/\n/g, '')))), sha: x.sha, path }; }
  catch (e) { if (String(e.message).includes('GitHub API 404')) return null; throw e; }
}
async function listContent(env, kind) {
  if (kind === 'settings') { const x = await readGithubFile(env, 'content/settings/site.json'); return x ? { settings: x.content, sha: x.sha } : { settings: {} }; }
  const folder = kind === 'videos' ? 'content/videos' : kind === 'journals' ? 'content/jurnal' : null;
  if (!folder) throw new Error('Jenis konten tidak valid.');
  const files = await githubRequest(env, folder);
  const out = [];
  for (const f of files.filter(x => x.type === 'file' && x.name.endsWith('.json'))) {
    const data = await readGithubFile(env, `${folder}/${f.name}`);
    if (data) out.push({ ...data.content, _file: f.name, _sha: data.sha });
  }
  out.sort((a,b) => String(b.date || '').localeCompare(String(a.date || '')));
  return { items: out };
}
async function writeGithubFile(env, path, content, shaValue, message) {
  const body = { message, branch: env.GITHUB_BRANCH || 'main', content: utf8Base64(JSON.stringify(content, null, 2) + '\n') };
  if (shaValue) body.sha = shaValue;
  return githubRequest(env, path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
async function deleteGithubFile(env, path, shaValue, message) {
  return githubRequest(env, path, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, sha: shaValue, branch: env.GITHUB_BRANCH || 'main' }) });
}
function slugOk(s) { return typeof s === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 90; }

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    const origin = request.headers.get('Origin') || '';
    const allowedOrigins = (env.SITE_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
    if (origin && !allowedOrigins.includes(origin)) return response(request, env, { error: 'Origin tidak diizinkan.' }, 403);
    try {
      if (url.pathname === '/health') return response(request, env, { ok: true, service: 'my-little-journey-admin-api' });
      if (url.pathname === '/setup/initialize' && request.method === 'POST') {
        if (!env.BOOTSTRAP_SECRET || request.headers.get('X-Bootstrap-Secret') !== env.BOOTSTRAP_SECRET) return response(request, env, { error: 'Tidak diizinkan.' }, 403);
        const existing = await env.DB.prepare('SELECT COUNT(*) AS n FROM admin_users').first();
        if (existing.n > 0) return response(request, env, { error: 'Admin sudah diinisialisasi. Endpoint setup sudah terkunci.' }, 409);
        const body = await request.json();
        const username = String(body.username || env.ADMIN_USERNAME || '').trim();
        const email = String(body.email || env.ADMIN_EMAIL || '').trim().toLowerCase();
        const password = String(body.password || '');
        if (username !== env.ADMIN_USERNAME || email !== String(env.ADMIN_EMAIL).toLowerCase() || password.length < 12) return response(request, env, { error: 'Username/email tidak sesuai konfigurasi atau password kurang dari 12 karakter.' }, 400);
        const salt = b64(random(16)); const hash = await passwordHash(password, salt);
        await env.DB.prepare('INSERT INTO admin_users(username,email,password_hash,password_salt) VALUES(?,?,?,?)').bind(username,email,hash,salt).run();
        return response(request, env, { ok: true, message: 'Admin awal berhasil dibuat. Hapus BOOTSTRAP_SECRET setelah proses ini.' }, 201);
      }
      if (url.pathname === '/auth/login' && request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (!await rateLimit(env, `login:${ip}`, 8, 900)) return response(request, env, { error: 'Terlalu banyak percobaan. Coba lagi 15 menit.' }, 429);
        const body = await request.json(); const username = String(body.username || ''); const password = String(body.password || '');
        const user = await env.DB.prepare('SELECT * FROM admin_users WHERE username=?').bind(username).first();
        if (!user) return response(request, env, { error: 'Username atau password salah.' }, 401);
        const check = await passwordHash(password, user.password_salt);
        if (check !== user.password_hash) return response(request, env, { error: 'Username atau password salah.' }, 401);
        if (!await rateLimit(env, `otp-send:${user.id}`, 4, 3600)) return response(request, env, { error: 'Batas pengiriman OTP tercapai. Coba lagi satu jam.' }, 429);
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0');
        const id = hex(random(16)); if (!env.OTP_PEPPER) throw new Error('OTP_PEPPER belum dikonfigurasi sebagai secret.');
        const pepper = env.OTP_PEPPER;
        const otpHash = await sha(`${id}:${code}:${pepper}`);
        await env.DB.prepare('INSERT INTO otp_challenges(id,user_id,otp_hash,expires_at,created_at) VALUES(?,?,?,?,?)').bind(id,user.id,otpHash,now()+300,now()).run();
        await sendOtp(env, user.email, code);
        return response(request, env, { ok: true, challengeId: id, message: 'Kode verifikasi telah dikirim ke email admin.' });
      }
      if (url.pathname === '/auth/verify' && request.method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (!await rateLimit(env, `otp-verify:${ip}`, 12, 900)) return response(request, env, { error: 'Terlalu banyak percobaan OTP. Coba lagi nanti.' }, 429);
        const body = await request.json(); const id = String(body.challengeId || ''); const code = String(body.code || '').replace(/\D/g, '');
        const ch = await env.DB.prepare('SELECT * FROM otp_challenges WHERE id=? AND consumed=0').bind(id).first();
        if (!ch || ch.expires_at < now() || ch.attempts >= 5) return response(request, env, { error: 'Kode OTP kedaluwarsa atau tidak valid. Silakan login kembali.' }, 401);
        if (!env.OTP_PEPPER) throw new Error('OTP_PEPPER belum dikonfigurasi sebagai secret.');
        const pepper = env.OTP_PEPPER;
        const candidate = await sha(`${id}:${code}:${pepper}`);
        if (candidate !== ch.otp_hash) { await env.DB.prepare('UPDATE otp_challenges SET attempts=attempts+1 WHERE id=?').bind(id).run(); return response(request, env, { error: 'Kode OTP salah.' }, 401); }
        await env.DB.prepare('UPDATE otp_challenges SET consumed=1 WHERE id=?').bind(id).run();
        const token = b64(random(32)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
        await env.DB.prepare('INSERT INTO admin_sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)').bind(await sha(token),ch.user_id,now()+43200,now()).run();
        return response(request, env, { ok: true, user: { username: env.ADMIN_USERNAME || 'admin' } }, 200, { 'Set-Cookie': cookie(token, 43200) });
      }
      if (url.pathname === '/auth/logout' && request.method === 'POST') {
        const raw = getCookie(request); if (raw) await env.DB.prepare('DELETE FROM admin_sessions WHERE token_hash=?').bind(await sha(raw)).run();
        return response(request, env, { ok: true }, 200, { 'Set-Cookie': cookie('', 0) });
      }
      const session = await requireSession(request, env);
      if (url.pathname.startsWith('/admin/')) {
        if (!session) return response(request, env, { error: 'Sesi tidak valid. Silakan login kembali.' }, 401);
        if (url.pathname === '/admin/me' && request.method === 'GET') return response(request, env, { user: { username: session.username, email: session.email } });
        if (url.pathname === '/admin/content' && request.method === 'GET') {
          const kind = url.searchParams.get('kind') || 'settings';
          return response(request, env, await listContent(env, kind));
        }
        if (url.pathname === '/admin/content' && request.method === 'POST') {
          const body = await request.json(); const kind = body.kind; const action = body.action || 'save';
          if (kind === 'settings') {
            if (action !== 'save' || !body.content || typeof body.content !== 'object') return response(request, env, { error: 'Data pengaturan tidak valid.' }, 400);
            const old = await readGithubFile(env, 'content/settings/site.json');
            await writeGithubFile(env, 'content/settings/site.json', body.content, old?.sha, 'Update website settings from admin');
            return response(request, env, { ok: true, message: 'Pengaturan disimpan. Website akan diperbarui setelah build Cloudflare selesai.' });
          }
          const folder = kind === 'videos' ? 'content/videos' : kind === 'journals' ? 'content/jurnal' : null;
          if (!folder) return response(request, env, { error: 'Jenis konten tidak valid.' }, 400);
          const content = body.content || {}; const slug = String(content.slug || body.slug || '');
          if (!slugOk(slug)) return response(request, env, { error: 'Slug wajib berupa huruf kecil, angka, dan tanda hubung.' }, 400);
          const path = `${folder}/${slug}.json`;
          if (action === 'delete') {
            const existing = await readGithubFile(env, path); if (!existing) return response(request, env, { error: 'Konten tidak ditemukan.' }, 404);
            await deleteGithubFile(env, path, existing.sha, `Delete ${kind} ${slug} from admin`);
            return response(request, env, { ok: true, message: 'Konten dihapus.' });
          }
          const old = await readGithubFile(env, path);
          await writeGithubFile(env, path, content, old?.sha, `${old ? 'Update' : 'Add'} ${kind} ${slug} from admin`);
          const originalSlug = String(body.originalSlug || '');
          if (originalSlug && originalSlug !== slug && slugOk(originalSlug)) {
            const oldPath = `${folder}/${originalSlug}.json`;
            const previous = await readGithubFile(env, oldPath);
            if (previous) await deleteGithubFile(env, oldPath, previous.sha, `Rename ${kind} ${originalSlug} to ${slug} from admin`);
          }
          return response(request, env, { ok: true, message: 'Konten disimpan. Website akan diperbarui setelah build Cloudflare selesai.' });
        }
        if (url.pathname === '/admin/upload' && request.method === 'POST') {
          const form = await request.formData(); const file = form.get('file');
          if (!file || typeof file.arrayBuffer !== 'function') return response(request, env, { error: 'File tidak ditemukan.' }, 400);
          if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) return response(request, env, { error: 'Format gambar harus JPG, PNG, WebP, atau GIF.' }, 415);
          if (file.size > 8 * 1024 * 1024) return response(request, env, { error: 'Ukuran gambar maksimal 8 MB.' }, 413);
          const ext = ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[file.type];
          const key = `uploads/${new Date().toISOString().slice(0,10)}/${crypto.randomUUID()}.${ext}`;
          await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' } });
          const base = String(env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '');
          if (!base) throw new Error('R2_PUBLIC_BASE_URL belum dikonfigurasi.');
          return response(request, env, { ok: true, url: `${base}/${key}`, key });
        }
        if (url.pathname === '/admin/account' && request.method === 'POST') {
          const body = await request.json();
          if (body.action === 'password') {
            const current = String(body.currentPassword || ''); const next = String(body.newPassword || '');
            const u = await env.DB.prepare('SELECT * FROM admin_users WHERE id=?').bind(session.user_id).first();
            if (await passwordHash(current, u.password_salt) !== u.password_hash) return response(request, env, { error: 'Password saat ini salah.' }, 401);
            if (next.length < 12) return response(request, env, { error: 'Password baru minimal 12 karakter.' }, 400);
            const salt = b64(random(16)); const hash = await passwordHash(next, salt);
            await env.DB.prepare('UPDATE admin_users SET password_hash=?,password_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=?').bind(hash,salt,session.user_id).run();
            await env.DB.prepare('DELETE FROM admin_sessions WHERE user_id=?').bind(session.user_id).run();
            return response(request, env, { ok: true, message: 'Password diubah. Silakan login kembali.' }, 200, { 'Set-Cookie': cookie('',0) });
          }
          return response(request, env, { error: 'Aksi akun tidak dikenal.' }, 400);
        }
      }
      return response(request, env, { error: 'Endpoint tidak ditemukan.' }, 404);
    } catch (e) {
      return response(request, env, { error: e.message || 'Terjadi kesalahan server.' }, 500);
    }
  }
};
