import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const fileConfig = (firebaseConfig as any).default || firebaseConfig;

// Allow overriding via Vite Environment Variables for production environments like Hostinger
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || fileConfig.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || fileConfig.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || fileConfig.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || fileConfig.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || fileConfig.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || fileConfig.appId || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || fileConfig.measurementId || "",
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || fileConfig.firestoreDatabaseId || ""
};

// Initialize Firebase App safely ensuring it isn't initialized multiple times
const app = getApps().length === 0 ? initializeApp(config) : getApp();

export const auth = getAuth(app);

// Use custom Firestore Database ID if configured, otherwise default
const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' && config.firestoreDatabaseId !== ''
  ? config.firestoreDatabaseId 
  : undefined;

// Initialize Firestore with standard settings
export const db = initializeFirestore(app, {}, dbId);

