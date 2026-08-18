import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import firebaseConfig from './firebase-applet-config.json';

// Silence non-fatal Firestore internal warnings (such as primary lease acquisition on background index backfill across tabs/iframes)
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true,
  },
  (firebaseConfig as any).firestoreDatabaseId || '(default)'
);



