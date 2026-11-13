/** Save a GitHub token into .env without touching anything else. */
import fs from 'node:fs';

const token = (process.argv[2] || '').trim();
if (!token) {
  console.error('usage: node scripts/set-token.mjs <token>');
  process.exit(1);
}
if (!/^[A-Za-z0-9_-]{20,}$/.test(token)) {
  console.error('This does not look like a GitHub token (expected 20+ characters).');
  process.exit(1);
}

const file = '.env';
const template = fs.existsSync('.env.example') ? fs.readFileSync('.env.example', 'utf8') : '';
let text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : template;

if (/^GITHUB_TOKEN=.*$/m.test(text)) {
  text = text.replace(/^GITHUB_TOKEN=.*$/m, `GITHUB_TOKEN=${token}`);
} else {
  text = `${text.trimEnd()}\nGITHUB_TOKEN=${token}\n`;
}

fs.writeFileSync(file, text);
fs.chmodSync(file, 0o600);
console.log('✓ token saved to .env');
