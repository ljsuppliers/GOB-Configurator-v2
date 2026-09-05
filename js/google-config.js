// Google OAuth WEB client for sending purchase orders from Liam's own Gmail
// (liam@gardenofficebuildings.co.uk) via the Gmail API, straight from the
// browser. Create it in Google Cloud Console (project "gob-configurator"):
//   APIs & Services -> Credentials -> Create credentials -> OAuth client ID
//   -> Web application -> Authorised JavaScript origins:
//        https://gob-configurator.vercel.app
//   (no redirect URI needed for the token flow). Enable the Gmail API.
//   OAuth consent screen: add liam@gardenofficebuildings.co.uk as a test user
//   (or publish the app). Then paste the client ID below and redeploy.
export const GOOGLE_WEB_CLIENT_ID = '';
export const SENDER_EMAIL = 'liam@gardenofficebuildings.co.uk';
