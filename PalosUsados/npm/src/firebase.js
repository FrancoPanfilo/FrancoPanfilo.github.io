import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FB_KEY,
  authDomain:        import.meta.env.VITE_FB_AUTH,
  projectId:         import.meta.env.VITE_FB_PROJECT,
  messagingSenderId: import.meta.env.VITE_FB_SENDER,
  appId:             import.meta.env.VITE_FB_APP,
};

const app = initializeApp(firebaseConfig);

export const db   = getFirestore(app);
export const auth = getAuth(app);
