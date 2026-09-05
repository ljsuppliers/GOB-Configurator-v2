// Installer register: stored as `installers` inside the catalogue document
// (settings/catalogue) - see app.js ensureInstallers/saveInstallerList.
export function emptyInstaller() {
  return { name: '', email: '', phone: '', dayRate: 400, notes: '' };
}
