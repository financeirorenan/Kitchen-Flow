import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const config = (firebaseConfig as any).default || firebaseConfig;

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' ? config.firestoreDatabaseId : undefined);

