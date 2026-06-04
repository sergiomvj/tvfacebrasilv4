#!/usr/bin/env node
const fs = require('fs');
const crypto = require('crypto');

const appId = process.env.GITHUB_APP_ID || readTrim('/home/sergio/.openclaw/secrets/github-app-id.txt');
const installationId = process.env.GITHUB_APP_INSTALLATION_ID || readTrim('/home/sergio/.openclaw/secrets/github-installation-id.txt');
const keyPath = process.env.GITHUB_APP_PRIVATE_KEY || '/home/sergio/.openclaw/secrets/github-app.pem';

function readTrim(path) {
  try { return fs.readFileSync(path, 'utf8').trim(); }
  catch { return ''; }
}
function b64url(input) {
  return Buffer.from(input).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function signJwt(appId, pem) {
  const now = Math.floor(Date.now()/1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iat: now - 60, exp: now + 540, iss: String(appId) };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const sig = crypto.sign('RSA-SHA256', Buffer.from(body), pem);
  return `${body}.${b64url(sig)}`;
}
async function main() {
  if (!appId) throw new Error('Missing GITHUB_APP_ID or github-app-id.txt');
  if (!installationId) throw new Error('Missing GITHUB_APP_INSTALLATION_ID or github-installation-id.txt');
  if (!fs.existsSync(keyPath)) throw new Error(`Missing private key: ${keyPath}`);
  const pem = fs.readFileSync(keyPath, 'utf8');
  const jwt = signJwt(appId, pem);
  const res = await fetch(`https://api.github.com/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'openclaw-github-app'
    }
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GitHub token request failed ${res.status}: ${text}`);
  const data = JSON.parse(text);
  if (process.argv.includes('--json')) console.log(JSON.stringify(data, null, 2));
  else console.log(data.token);
}
main().catch(err => { console.error(err.message); process.exit(1); });
