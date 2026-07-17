import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

const config = (firebaseConfig as any).default || firebaseConfig;

// Initialize Firebase App safely ensuring it isn't initialized multiple times
const app = getApps().length === 0 ? initializeApp(config) : getApp();

export const auth = getAuth(app);

// Use custom Firestore Database ID if configured, otherwise default
const dbId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)' 
  ? config.firestoreDatabaseId 
  : undefined;

// Initialize Firestore with standard settings
export const db = initializeFirestore(app, {}, dbId);

