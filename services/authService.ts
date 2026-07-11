import { auth, db as firestoreDb } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  signInWithCustomToken, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  sendPasswordResetEmail,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db as localDb } from './db';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiration: number;
  tenantId: string;
  userId: string;
  role: string;
  permissions: string[];
  plan: string;
  empresa: string;
  createdAt: string;
  active: boolean;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name: string;
  tenantId: string;
  active: boolean;
  status: string;
}

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Purges all local storage, session storage, and IndexedDB data to prevent
   * remnants of old email-based identifiers or other accounts.
   */
  public async purgeAllCachesAndStorages(preserveSession?: { session: AuthSession; user: AuthenticatedUser }): Promise<void> {
    console.log('[AuthService] Initiating complete purge of all local caches and databases...');
    
    // 1. Clear IndexedDB (Dexie Local Db)
    try {
      await localDb.clearAllData();
      console.log('[AuthService] Local IndexedDB cleared successfully.');
    } catch (dbErr) {
      console.warn('[AuthService] Error clearing local IndexedDB:', dbErr);
    }

    // 2. Clear sessionStorage
    try {
      sessionStorage.clear();
      console.log('[AuthService] sessionStorage cleared successfully.');
    } catch (sessErr) {
      console.warn('[AuthService] Error clearing sessionStorage:', sessErr);
    }

    // 3. Clear localStorage completely
    try {
      localStorage.clear();
      console.log('[AuthService] localStorage cleared successfully.');
    } catch (localErr) {
      console.warn('[AuthService] Error clearing localStorage:', localErr);
    }

    // 4. If we have a session to preserve (newly initiated UID session), reconstruct it now
    if (preserveSession) {
      console.log(`[AuthService] Reconstructing active session for UID: ${preserveSession.user.id}`);
      try {
        localStorage.setItem('kitchenflow_session', JSON.stringify(preserveSession.session));
        localStorage.setItem('kitchenflow_cached_user', JSON.stringify(preserveSession.user));
      } catch (storeErr) {
        console.error('[AuthService] Error writing preserved session to localStorage:', storeErr);
      }
    }

    // 5. Clear Service Workers caches if available
    if (window.caches) {
      try {
        const keys = await window.caches.keys();
        await Promise.all(keys.map(key => window.caches.delete(key)));
        console.log('[AuthService] Browser CacheStorage cleared.');
      } catch (cacheErr) {
        console.warn('[AuthService] Error clearing Browser CacheStorage:', cacheErr);
      }
    }

    // 6. Clear any window-injected globals (e.g. React Query / state manager cache)
    const anyWindow = window as any;
    if (anyWindow.__REACT_QUERY_STATE__) anyWindow.__REACT_QUERY_STATE__ = undefined;
    if (anyWindow.queryClient) {
      try {
        anyWindow.queryClient.clear();
      } catch {}
    }
  }

  /**
   * Initiates a session for a specific UID.
   * Clears all old caches first to guarantee a pristine, isolated state, 
   * and then writes the newly acquired UID session data.
   */
  public async initiateSession(session: AuthSession, user: AuthenticatedUser): Promise<void> {
    console.log(`[AuthService] Starting session initialization for UID: ${user.id}`);
    
    // 1. Rigorous cleanup of all prior caches/states
    await this.purgeAllCachesAndStorages({ session, user });

    console.log(`[AuthService] Session successfully rebuilt for UID: ${user.id}. Ready for context bootstrap.`);
  }

  /**
   * Performs standard authentication via Server API & Firebase Client SDK.
   */
  public async loginWithAPI(email: string, password: string): Promise<{ success: boolean; user: AuthenticatedUser; session?: AuthSession }> {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    console.log(`[AuthService] Initiating API authentication for email: ${trimmedEmail}`);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('Falha no login do servidor.');
    }

    const session: AuthSession = data.session;
    const user: AuthenticatedUser = {
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
      tenantId: data.user.tenantId,
      active: true,
      status: 'online'
    };

    // Complete purge & rebuild session
    await this.initiateSession(session, user);

    // Authenticate client-side via Custom Token or standard sign-in if needed for Firebase SDK sync
    if (data.customToken) {
      try {
        console.log('[AuthService] Authenticating Client SDK with custom token...');
        await signInWithCustomToken(auth, data.customToken);
      } catch (clientErr) {
        console.warn('[AuthService] Client SDK custom token login skipped or failed, using API session:', clientErr);
      }
    } else if (data.isLocalSession) {
      console.log('[AuthService] Local session authorized. Bypassing client-side sign-in.');
    }

    return { success: true, user, session };
  }

  /**
   * Refreshes the session using the Refresh Token.
   */
  public async refreshSession(refreshToken: string): Promise<AuthSession> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro crítico ao renovar a sessão.');
    }

    const data = await response.json();
    if (!data.success || !data.session) {
      throw new Error('Falha ao atualizar sessão no servidor.');
    }

    // Update localStorage
    localStorage.setItem('kitchenflow_session', JSON.stringify(data.session));
    return data.session;
  }

  /**
   * Signs the user out from Firebase and wipes out all local data.
   */
  public async logout(): Promise<void> {
    console.log('[AuthService] Performing user logout and complete storage wipeout...');
    try {
      await signOut(auth);
    } catch (signOutErr) {
      console.warn('[AuthService] Firebase client signOut failed:', signOutErr);
    }
    await this.purgeAllCachesAndStorages();
  }
}

export const authService = AuthService.getInstance();
