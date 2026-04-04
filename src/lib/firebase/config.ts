import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAdI5gqXuC9zkIz2X-9ovy7JNsP3usTr9s",
  authDomain: "milletneder.firebaseapp.com",
  projectId: "milletneder",
  storageBucket: "milletneder.firebasestorage.app",
  messagingSenderId: "728956676417",
  appId: "1:728956676417:web:04cd3cffd43c8ace6919c0",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);

// E-posta şablonlarını Türkçe gönder
auth.languageCode = 'tr';
