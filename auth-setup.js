/**
 * One-time OAuth setup - run this to authorize
 */
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, 'oauth-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'oauth-token.json');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive'
];

async function authorize() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const { client_id, client_secret } = credentials.installed || credentials.web;
  
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'http://localhost:3002/oauth2callback'
  );

  // Check if we already have a token
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));
    oauth2Client.setCredentials(token);
    console.log('Already authorized! Token exists.');
    
    // Test it
    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const res = await drive.files.list({ pageSize: 1 });
    console.log('Token works! Ready to create quotes.');
    return;
  }

  // Need to authorize
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('Opening browser for authorization...');
  console.log('If browser doesn\'t open, visit:', authUrl);

  // Open browser
  const open = (await import('open')).default;
  open(authUrl);

  // Start local server to receive callback
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const query = url.parse(req.url, true).query;
      
      if (query.code) {
        res.end('Authorization successful! You can close this tab.');
        server.close();

        try {
          const { tokens } = await oauth2Client.getToken(query.code);
          oauth2Client.setCredentials(tokens);
          fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
          console.log('\n✅ Authorization successful! Token saved.');
          console.log('You can now create Google Sheets quotes.');
          resolve();
        } catch (err) {
          console.error('Error getting token:', err);
          reject(err);
        }
      }
    }).listen(3002, () => {
      console.log('Waiting for authorization on http://localhost:3002...');
    });
  });
}

authorize().catch(console.error);
