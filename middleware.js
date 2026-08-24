/**
 * Site-wide password gate (HTTP Basic Auth). The Vercel dashboard's password
 * protection is a paid add-on, so this middleware does the same job: every
 * request must carry the password below or the browser shows a login prompt.
 * Username is ignored — any value works.
 */
const PASSWORD = 'GoBuildings007!!';

export const config = { matcher: '/(.*)' };

export default function middleware(request) {
  const auth = request.headers.get('authorization') || '';
  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const password = decoded.slice(decoded.indexOf(':') + 1);
      if (password === PASSWORD) return; // authorised — continue to the site
    } catch {
      // fall through to the 401 below
    }
  }
  return new Response('Password required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="GOB Configurator"' },
  });
}
