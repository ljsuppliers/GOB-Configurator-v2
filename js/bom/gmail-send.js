// Send purchase orders from Liam's Gmail (liam@gardenofficebuildings.co.uk)
// using Google Identity Services (token flow) + the Gmail API, client-side.
// The sent emails land in his Sent folder and replies come back to his inbox,
// which is why this is preferred over a transactional service.
import { GOOGLE_WEB_CLIENT_ID, SENDER_EMAIL } from '../google-config.js';

const SCOPES = 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email';
let tokenClient = null;
let accessToken = null;
let tokenExpiry = 0;
let signedInAs = '';

export function gmailConfigured() { return !!GOOGLE_WEB_CLIENT_ID; }
export function gmailSignedInAs() { return signedInAs; }

function loadGis() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true; s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google sign-in'));
    document.head.appendChild(s);
  });
}

/** Get (or refresh) an access token; pops the Google consent window when needed. */
export async function ensureToken() {
  if (!gmailConfigured()) throw new Error('Gmail sending is not configured (no Google client ID)');
  if (accessToken && Date.now() < tokenExpiry - 60_000) return accessToken;
  await loadGis();
  return new Promise((resolve, reject) => {
    tokenClient = tokenClient || window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: SCOPES,
      hint: SENDER_EMAIL,
      callback: () => {},
    });
    tokenClient.callback = async (resp) => {
      if (resp.error) return reject(new Error(resp.error_description || resp.error));
      accessToken = resp.access_token;
      tokenExpiry = Date.now() + (resp.expires_in || 3600) * 1000;
      try {
        const me = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => r.json());
        signedInAs = me.email || '';
      } catch (e) { signedInAs = ''; }
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

function b64url(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeHeader(v) {
  // RFC 2047 for non-ASCII subjects
  return /^[\x20-\x7e]*$/.test(v) ? v : `=?UTF-8?B?${btoa(unescape(encodeURIComponent(v)))}?=`;
}

/** Send one plain-text email as the signed-in Gmail user. Returns the Gmail message id. */
export async function sendEmail({ to, subject, body, cc }) {
  const token = await ensureToken();
  if (signedInAs && signedInAs.toLowerCase() !== SENDER_EMAIL.toLowerCase()) {
    throw new Error(`Signed in as ${signedInAs} - orders must go from ${SENDER_EMAIL}. Sign out of that Google account and try again.`);
  }
  const headers = [
    `To: ${to}`,
    cc ? `Cc: ${cc}` : null,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
  ].filter(Boolean).join('\r\n');
  const raw = b64url(`${headers}\r\n\r\n${body.replace(/\r?\n/g, '\r\n')}`);
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Gmail send failed (${r.status}): ${t.slice(0, 200)}`);
  }
  const j = await r.json();
  return j.id;
}
