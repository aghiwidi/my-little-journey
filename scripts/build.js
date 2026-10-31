'use strict';

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

function remove(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
  });
}

function readJsonDirectory(relativeDirectory) {
  const directory = path.join(root, relativeDirectory);
  return listFiles(directory)
    .filter(file => file.toLowerCase().endsWith('.json'))
    .map(file => {
      try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch (error) {
        throw new Error(`JSON tidak valid pada ${path.relative(root, file)}: ${error.message}`);
      }
    });
}

const settingsPath = path.join(root, 'content', 'settings', 'site.json');
if (!fs.existsSync(settingsPath)) {
  throw new Error('File wajib tidak ditemukan: content/settings/site.json');
}

let siteSettings;
try {
  siteSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
} catch (error) {
  throw new Error(`Pengaturan website bukan JSON valid: ${error.message}`);
}

remove(dist);
fs.mkdirSync(dist, { recursive: true });

const excludedRoots = new Set(['dist', 'node_modules', '.git', 'worker', 'content', 'scripts']);
const excludedFiles = new Set([
  'wrangler.toml',
  'package.json',
  'package-lock.json',
  'README.md',
  '.gitignore',
  '.pages.yml'
]);

for (const file of listFiles(root)) {
  const relative = path.relative(root, file);
  const firstSegment = relative.split(path.sep)[0];
  if (excludedRoots.has(firstSegment) || excludedFiles.has(relative)) continue;
  if (path.basename(file) === '.gitkeep') continue;
  copyFile(file, path.join(dist, relative));
}

const videos = readJsonDirectory('content/videos')
  .filter(item => item && item.status === 'published');
const journals = readJsonDirectory('content/jurnal')
  .filter(item => item && item.status === 'published');

const dataDirectory = path.join(dist, 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

fs.writeFileSync(path.join(dataDirectory, 'site.json'), JSON.stringify(siteSettings, null, 2));
fs.writeFileSync(path.join(dataDirectory, 'videos.json'), JSON.stringify(videos, null, 2));
fs.writeFileSync(path.join(dataDirectory, 'jurnal.json'), JSON.stringify(journals, null, 2));

console.log(`Build complete: ${videos.length} videos, ${journals.length} journal entries.`);
console.log(`Site settings loaded: ${siteSettings.site_title || 'MY LITTLE JOURNEY'}`);
console.log(`Output directory: ${dist}`);
