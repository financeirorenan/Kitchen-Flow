import React, { useState, memo } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile, updatePassword } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { LogIn, Mail, Lock, Sparkles, Loader2, UserPlus, Phone, User } from 'lucide-react';
import { maskPhone } from '../utils/masks';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = memo(({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMarketplace = window.location.pathname.startsWith('/marketplace');

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPassword = password.trim();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!trimmedEmail) {
        setError('Acesso recusado. O e-mail de identificação é obrigatório.');
        setLoading(false);
        return;
      }
      if (!emailRegex.test(trimmedEmail)) {
        setError('Por favor, forneça um endereço de e-mail válido (ex: seu@email.com).');
        setLoading(false);
        return;
      }
      if (!trimmedPassword) {
        setError('A senha de acesso é obrigatória de ser informada.');
        setLoading(false);
        return;
      }
      if (trimmedPassword.length < 6) {
        setError('A senha de acesso e validação necessita de ao menos 6 caracteres.');
        setLoading(false);
        return;
      }

      if (mode === 'signup') {
        if (!name.trim()) {
          setError('Por favor, digite seu nome completo para concluir o cadastro.');
          setLoading(false);
          return;
        }
        if (!phone.trim()) {
          setError('O número de telefone é obrigatório para notificações e entregas.');
          setLoading(false);
          return;
        }
      }

      if (mode === 'login') {
        // 1. CHECAGEM SE EXISTE O EMAIL CADASTRADO NAS PLATAFORMAS DOS LOJISTAS OU ADMIN MASTER
        const isMaster = trimmedEmail === 'financeirorenanuk@gmail.com';
        let isRegistered = isMaster;
        let userData: any = null;
        let userDocId: string | null = null;

        if (!isMaster) {
          // Buscar em users do Firestore
          const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail), limit(1));
          const usersByEmailSnap = await getDocs(usersByEmailQuery);
          
          if (!usersByEmailSnap.empty) {
            isRegistered = true;
            userData = usersByEmailSnap.docs[0].data();
            userDocId = usersByEmailSnap.docs[0].id;
          } else {
            // Se não encontrou, buscar em couriers
            const couriersQuery = query(collection(db, 'couriers'), where('email', '==', trimmedEmail), limit(1));
            const couriersSnap = await getDocs(couriersQuery);
            if (!couriersSnap.empty) {
              isRegistered = true;
            }
          }
        }

        if (!isRegistered) {
          setError('Acesso negado. Este e-mail não pertence a nenhuma das plataformas dos nossos lojistas parceiros.');
          setLoading(false);
          return;
        }

        // 2. CASO EXISTA NO FIRESTORE E TENHA SENHA REGISTRADA LÁ, VALIDAR SE COMBINA COM A DIGITADA
        if (userData && userData.password && userData.password !== trimmedPassword) {
          setError('Credenciais inválidas. Verifique seu e-mail e senha.');
          setLoading(false);
          return;
        }

        // 3. RETORNAR LOGIN COM SISTEMA DETERMINÍSTICO DE SENHAS
        const getDeterministicPassword = (emailStr: string) => {
          return `gastro_secure_${btoa(emailStr).replace(/=/g, '')}_2026`;
        };

        // Se for staff (tem senha cadastrada no firestore), usamos a senha determinística interna para Firebase Auth
        const authPassword = (userData && userData.password) ? getDeterministicPassword(trimmedEmail) : trimmedPassword;

        try {
          await signInWithEmailAndPassword(auth, trimmedEmail, authPassword);
        } catch (authErr: any) {
          const isErrorCred = authErr.code === 'auth/user-not-found' || 
                              authErr.code === 'auth/invalid-credential' || 
                              authErr.code === 'auth/wrong-password';

          // Se falhou na senha determinística, mas a senha no Firestore bate,
          // tentamos fazer login com a senha digitada pelo usuário original
          if (isErrorCred && userData && userData.password === trimmedPassword) {
            try {
              await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
              // Caso consiga o login com a senha antiga/explicita, atualizamos para a determinística
              if (auth.currentUser) {
                await updatePassword(auth.currentUser, authPassword);
              }
              onLoginSuccess();
              return;
            } catch (fallbackErr: any) {
              console.warn("Fallback direct login failed, trying to auto-create user: ", fallbackErr);
            }

            // Se ainda assim deu erro de usuário não encontrado ou senha incorreta no Auth, auto-criamos o login com a determinística
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, authPassword);
              const user = userCredential.user;
              await updateProfile(user, { displayName: userData.name || 'Lojista' });
              
              // Vincular no Firestore
              const userDocRef = doc(db, 'users', user.uid);
              await setDoc(userDocRef, {
                ...userData,
                id: user.uid,
                updatedAt: new Date()
              }, { merge: true });

              if (userDocId && userDocId !== user.uid) {
                await deleteDoc(doc(db, 'users', userDocId));
              }
            } catch (createErr: any) {
              console.error("Auto create error:", createErr);
              throw authErr; // joga o erro original
            }
          } else {
            throw authErr;
          }
        }
      } else {
        // Registro (Apenas no marketplace)
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });
        
        await setDoc(doc(db, 'users', user.uid), {
          id: user.uid,
          name,
          email: trimmedEmail,
          phone,
          role: 'CUSTOMER',
          tenantId: 'GLOBAL',
          createdAt: new Date(),
          active: true
        });
      }
      onLoginSuccess();
    } catch (err: any) {
      const isInvalidCreds = err.code === 'auth/invalid-credential' || 
                             err.message?.includes('auth/invalid-credential') || 
                             err.message?.includes('invalid-credential');
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Este método de login não está ativado no Console do Firebase.');
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        setError('Este e-mail já está em uso.');
      } else if (isInvalidCreds) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        setError(mode === 'login' ? 'E-mail ou senha inválidos.' : 'Erro ao criar conta.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (firebaseUser && firebaseUser.email) {
        const trimmedEmail = firebaseUser.email.trim().toLowerCase();
        const isMaster = trimmedEmail === 'financeirorenanuk@gmail.com';
        let isRegistered = isMaster;

        if (!isMaster) {
          // Buscar em users
          const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail), limit(1));
          const usersByEmailSnap = await getDocs(usersByEmailQuery);
          if (!usersByEmailSnap.empty) {
            isRegistered = true;
          } else {
            // Buscar em couriers
            const couriersQuery = query(collection(db, 'couriers'), where('email', '==', trimmedEmail), limit(1));
            const couriersSnap = await getDocs(couriersQuery);
            if (!couriersSnap.empty) {
              isRegistered = true;
            }
          }
        }

        if (!isRegistered) {
          await auth.signOut();
          setError('Acesso negado. A sua conta Google não está cadastrada em nenhuma das plataformas dos nossos lojistas.');
          setLoading(false);
          return;
        }
      }

      onLoginSuccess();
    } catch (err: any) {
      const isInvalidCreds = err.code === 'auth/invalid-credential' || 
                             err.message?.includes('auth/invalid-credential') || 
                             err.message?.includes('invalid-credential');
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('O login via Google não está ativado no Console do Firebase.');
      } else if (err.code === 'auth/popup-blocked' || err.message?.includes('popup-blocked')) {
        setError('O pop-up de login foi bloqueado pelo seu navegador. Por favor, permita pop-ups para este site e tente novamente.');
      } else if (isInvalidCreds) {
        setError('Credenciais inválidas ou expiradas. Por favor, tente novamente.');
      } else {
        setError('Erro ao entrar com Google.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="p-8 sm:p-12">
          <div className="flex flex-col items-center mb-10">
            <div className={`w-16 h-16 ${isMarketplace ? 'bg-indigo-600' : 'bg-emerald-600'} rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-4 transform -rotate-6`}>
              <Sparkles className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter">
              {isMarketplace ? 'Marketplace Delivery' : 'Dashboard GastroAI'}
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-widest mt-1">
              {mode === 'login' ? 'Acesso ao Sistema' : 'Crie sua conta grátis'}
            </p>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-6">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="Seu Nome"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="password"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full ${isMarketplace ? 'bg-indigo-600' : 'bg-emerald-600'} text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : mode === 'login' ? <LogIn size={20} /> : <UserPlus size={20} />}
              {mode === 'login' ? (isMarketplace ? 'Entrar para Comprar' : 'Acessar Painel') : 'Criar minha Conta'}
            </button>
          </form>

          {isMarketplace && (
            <div className="mt-6 text-center">
              <button 
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
              >
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre aqui'}
              </button>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-100"></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ou continue com</span>
            <div className="flex-1 h-px bg-slate-100"></div>
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full mt-8 bg-white border-2 border-slate-100 text-slate-600 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>

          <p className="mt-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
            Acesso restrito a funcionários autorizados.<br />
            Problemas com acesso? Contate o suporte.
          </p>
        </div>
      </div>
    </div>
  );
});

export default Login;
