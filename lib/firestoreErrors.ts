import { auth } from '../firebase';
import { FirebaseError } from 'firebase/app';

export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null): void {
  const errMsg = error?.message || String(error);
  if (errMsg.includes('Quota') || errMsg.includes('quota') || error?.code === 'resource-exhausted' || errMsg.includes('INTERNAL ASSERTION FAILED')) {
    console.warn("Aviso do Firestore (cota excedida ou queda de conexão):", errMsg);
    return;
  }
  if (error instanceof FirebaseError && (error.code === 'permission-denied' || error.message.includes('insufficient permissions'))) {
    const firebaseUser = auth.currentUser;
    const errorInfo: FirestoreErrorInfo = {
      error: error.message,
      operationType,
      path,
      authInfo: {
        userId: firebaseUser?.uid || 'anonymous',
        email: firebaseUser?.email || 'none',
        emailVerified: firebaseUser?.emailVerified || false,
        isAnonymous: firebaseUser?.isAnonymous || true,
        providerInfo: firebaseUser?.providerData.map(p => ({
          providerId: p.providerId,
          displayName: p.displayName || '',
          email: p.email || ''
        })) || []
      }
    };
    console.warn("Firestore Permission Warning:", errorInfo);
    return;
  }
  console.warn("Firestore Operation Warning:", path, errMsg);
}
