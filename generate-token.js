/**
 * One-time script to generate oauth-token.json
 * Run: node generate-token.js
 *
 * 1. Opens a browser for Google sign-in
 * 2. After you grant access, paste the code back here
 * 3. Saves the token to oauth-token.json
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { google } = require('googleapis');
const open = (...args) => import('open').then(m => m.default(...args));

const credentialsPath = path.join(__dirname, 'oauth-credentials.json');
const tokenPath = path.join(__dirname, 'oauth-token.json');

if (!fs.existsSync(credentialsPath)) {
  console.error('❌ oauth-credentials.json not found!');
  console.error('Download it from Google Cloud Console → APIs & Services → Credentials');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath));
const { client_id, client_secret } = credentials.installed || credentials.web;

const REDIRECT_URI = 'http://localhost:3333/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

// Start a temporary local server to catch the OAuth callback
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3333');
  if (url.pathname === '/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      res.end('No code received');
      return;
    }

    try {
      const { tokens } = await oauth2Client.getToken(code);
      fs.writeFileSync(tokenPath, JSON.stringify(tokens, null, 2));
      console.log('\n✅ Token saved to oauth-token.json');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('<h1>✅ Success!</h1><p>Token saved. You can close this tab and stop the script.</p>');
    } catch (err) {
      console.error('❌ Error getting token:', err.message);
      res.writeHead(500);
      res.end('Error: ' + err.message);
    }

    setTimeout(() => {
      server.close();
      process.exit(0);
    }, 1000);
  }
});

server.listen(3333, async () => {
  console.log('🔐 Opening browser for Google sign-in...');
  console.log('If browser doesn\'t open, visit this URL:\n');
  console.log(authUrl);
  console.log('');

  try {
    await open(authUrl);
  } catch {
    console.log('(Could not open browser automatically — copy the URL above)');
  }
});
