import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';

let app: App;
let adminAuth: Auth;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccount) {
    const parsed = JSON.parse(serviceAccount);
    return initializeApp({ credential: cert(parsed) });
  }

  // Fallback: projectId only (for verifyIdToken with checkRevoked=false)
  return initializeApp({ projectId: 'milletneder' });
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    app = getAdminApp();
    adminAuth = getAuth(app);
  }
  return adminAuth;
}
