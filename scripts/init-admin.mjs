import { createInterface } from 'node:readline';
const api = process.env.ADMIN_API_URL || 'https://api.vinkasar.my.id';
const secret = process.env.BOOTSTRAP_SECRET;
if (!secret) { console.error('Atur BOOTSTRAP_SECRET di environment sebelum menjalankan script.'); process.exit(1); }
function hiddenPrompt(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY || !process.stdin.setRawMode) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      rl.question(question, answer => { rl.close(); resolve(answer); });
      return;
    }
    process.stdout.write(question);
    let value = '';
    process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
    const done = () => { process.stdin.setRawMode(false); process.stdin.pause(); process.stdin.removeListener('data', onData); process.stdout.write('\n'); };
    const onData = key => {
      if (key === '\u0003') { done(); reject(new Error('Dibatalkan.')); }
      else if (key === '\r' || key === '\n') { done(); resolve(value); }
      else if (key === '\u007f' || key === '\b') { value = value.slice(0,-1); }
      else if (key >= ' ') { value += key; }
    };
    process.stdin.on('data', onData);
  });
}
const password = await hiddenPrompt('Buat password admin (minimal 12 karakter, input disembunyikan): ');
if (password.length < 12) { console.error('Password minimal 12 karakter.'); process.exit(1); }
const response = await fetch(`${api}/setup/initialize`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Bootstrap-Secret': secret },
  body: JSON.stringify({ username: 'vinkasar263121', password })
});
const data = await response.json().catch(() => ({}));
if (!response.ok) { console.error(data.error || `Setup gagal (${response.status}).`); process.exit(1); }
console.log(data.message || 'Admin berhasil dibuat.');
