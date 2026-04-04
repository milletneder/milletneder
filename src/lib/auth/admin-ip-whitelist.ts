// Admin paneline giriş yapan IP + fingerprint için kayıt kısıtı muafiyeti
// In-memory store — 24 saat geçerli

const whitelistedIPs = new Map<string, number>();
const whitelistedFingerprints = new Map<string, number>();

const WHITELIST_DURATION_MS = 24 * 60 * 60 * 1000; // 24 saat

export function whitelistAdminIP(ip: string): void {
  whitelistedIPs.set(ip, Date.now() + WHITELIST_DURATION_MS);
}

export function whitelistAdminFingerprint(fingerprint: string): void {
  whitelistedFingerprints.set(fingerprint, Date.now() + WHITELIST_DURATION_MS);
}

export function isIPWhitelisted(ip: string): boolean {
  const expiry = whitelistedIPs.get(ip);
  if (!expiry) return false;
  if (Date.now() > expiry) { whitelistedIPs.delete(ip); return false; }
  return true;
}

export function isFingerprintWhitelisted(fingerprint: string): boolean {
  const expiry = whitelistedFingerprints.get(fingerprint);
  if (!expiry) return false;
  if (Date.now() > expiry) { whitelistedFingerprints.delete(fingerprint); return false; }
  return true;
}

// Cleanup every hour
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [k, exp] of whitelistedIPs) { if (now > exp) whitelistedIPs.delete(k); }
    for (const [k, exp] of whitelistedFingerprints) { if (now > exp) whitelistedFingerprints.delete(k); }
  }, 60 * 60 * 1000);
}
