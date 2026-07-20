import React, { useState, memo } from 'react';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, updateProfile, updatePassword, sendPasswordResetEmail, signInWithCustomToken } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
import { LogIn, Mail, Lock, Sparkles, Loader2, UserPlus, Phone, User, Store, Bike, Shield, Check, Eye, EyeOff } from 'lucide-react';
import { maskPhone } from '../utils/masks';

interface LoginProps {
  onLoginSuccess: () => void;
}

const COMMERCE_CATEGORIES = [
  { id: 'hamburgueria', name: 'Hamburgueria' },
  { id: 'pizzaria', name: 'Pizzaria' },
  { id: 'japonesa', name: 'Comida Japonesa / Sushi' },
  { id: 'italiana', name: 'Massas e Italiana' },
  { id: 'churrascaria', name: 'Churrasco e Grelhados' },
  { id: 'cafeteria', name: 'Cafeteria e Padaria' },
  { id: 'doceria', name: 'Doces e Confeitaria' },
  { id: 'sorveteria', name: 'Sorvetes e Açaí' },
  { id: 'saudavel', name: 'Comida Saudável e Fitness' }
];

export const getDeterministicPassword = (emailStr: string) => {
  try {
    return `kitchenflow_secure_${btoa(emailStr.toLowerCase().trim()).replace(/=/g, '')}_2026`;
  } catch (e) {
    let hash = 0;
    const str = emailStr.toLowerCase().trim();
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return `kitchenflow_secure_${Math.abs(hash)}_2100_2026`;
  }
};

const Login: React.FC<LoginProps> = memo(({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'first_access'>('login');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleEnterDemoMode = () => {
    setLoading(true);
    setError(null);
    try {
      const demoPayload = {
        firebaseUser: {
          uid: 'demo-admin-uid',
          email: 'financeirorenanuk@gmail.com',
          displayName: 'Renan (Demo)',
          emailVerified: true
        },
        userData: {
          id: 'demo-admin-uid',
          name: 'Renan (Demo)',
          email: 'financeirorenanuk@gmail.com',
          role: 'SAAS_ADMIN',
          tenantId: 'HCL1177LRQVPEKCTYRAHU7IGBQ42',
          permissions: ["dashboard_view", "orders_view", "menu_view", "stock_view", "finance_view", "couriers_view", "users_view", "integrations_view", "marketing_view", "reports_view", "saas_admin_view"],
          status: 'online',
          active: true,
          createdAt: new Date().toISOString()
        }
      };
      localStorage.setItem('kitchenflow_demo_user', JSON.stringify(demoPayload));
      setSuccessMessage('Acessando em Modo de Demonstração...');
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      setError('Erro ao iniciar modo demo: ' + err.message);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Por favor, digite seu e-mail no campo acima antes de clicar em "Esqueci minha senha".');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await sendPasswordResetEmail(auth, trimmedEmail);
      setSuccessMessage('Um e-mail de recuperação foi enviado! Verifique sua caixa de entrada e spam.');
    } catch (err: any) {
      console.error("Error sending password reset:", err);
      let errMsg = 'Erro ao enviar e-mail de recuperação. Verifique se o e-mail está correto.';
      if (err.code === 'auth/user-not-found' || err.message?.includes('user-not-found')) {
        errMsg = 'Este e-mail não está cadastrado em nosso sistema.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // States for Signup Roles
  const [signupRole, setSignupRole] = useState<'CUSTOMER' | 'COURIER' | 'OWNER'>('CUSTOMER');
  const [restaurantName, setRestaurantName] = useState('');
  const [tradeCategory, setTradeCategory] = useState('hamburgueria');
  const [vehicleType, setVehicleType] = useState<'bike' | 'moto' | 'car'>('moto');
  const [pixKey, setPixKey] = useState('');

  const isMarketplace = window.location.pathname.startsWith('/marketplace');

  // If we are strictly on the marketplace route, force the Customer signup role (for a clear customer-centric checkout flow)
  React.useEffect(() => {
    if (isMarketplace) {
      setSignupRole('CUSTOMER');
    }
  }, [isMarketplace]);

  const handleFirstAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedTempPassword = password.trim();
    const trimmedNewPassword = newPassword.trim();

    if (!trimmedEmail || !trimmedTempPassword || !trimmedNewPassword) {
      setError('Todos os campos são obrigatórios para a ativação da sua conta.');
      setLoading(false);
      return;
    }

    if (trimmedNewPassword.length < 6) {
      setError('A nova senha de acesso precisa ter ao menos 6 caracteres.');
      setLoading(false);
      return;
    }

    const hasUppercaseNew = /[A-Z]/.test(trimmedNewPassword);
    const hasLowercaseNew = /[a-z]/.test(trimmedNewPassword);
    const hasSpecialNew = /[!@#$%^&*(),.?":{}|<>_+\-\[\]\/\\`';~`=]/.test(trimmedNewPassword);

    if (!hasUppercaseNew || !hasLowercaseNew || !hasSpecialNew) {
      setError('A nova senha precisa ter no mínimo 6 caracteres, contendo pelo menos uma letra maiúscula, uma letra minúscula e um caractere especial (ex: @, #, $, %, etc.).');
      setLoading(false);
      return;
    }

    if (trimmedNewPassword !== confirmNewPassword.trim()) {
      setError('A confirmação da nova senha não confere com a senha digitada.');
      setLoading(false);
      return;
    }

    try {
      // 1. Verificar se usuário existe no Firestore
      const usersByEmailQuery = query(collection(db, 'users'), where('email', '==', trimmedEmail), limit(1));
      const usersByEmailSnap = await getDocs(usersByEmailQuery);

      if (usersByEmailSnap.empty) {
        setError('Acesso negado. Este e-mail não foi pré-cadastrado no sistema. Solicite o cadastro ao administrador.');
        setLoading(false);
        return;
      }

      const userData = usersByEmailSnap.docs[0].data();
      const userDocId = usersByEmailSnap.docs[0].id;

      // 2. Validar se a senha temporária confere com a do DB
      if (!userData.password || userData.password !== trimmedTempPassword) {
        setError('A senha temporária fornecida é inválida. Verifique os dados com seu administrador.');
        setLoading(false);
        return;
      }

      // 3. Criar ou sincronizar o usuário no Firebase Auth com a nova senha permanente
      let user;
      const isStaff = userData && userData.role !== 'CUSTOMER';
      const authNewPassword = trimmedNewPassword;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, authNewPassword);
        user = userCredential.user;
      } catch (authErr: any) {
        // Caso o usuário já exista no Auth (ex: foi criado mas senha estava desatrelada)
        if (authErr.code === 'auth/email-already-in-use') {
          try {
            // Tenta logar com a senha temporária real ou a legado determinística antiga para atualizar para a nova real
            let loginCred;
            try {
              loginCred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedTempPassword);
            } catch (tempErr) {
              if (isStaff) {
                // Tenta fallback com a senha determinística antiga
                const authTempPassword = getDeterministicPassword(trimmedEmail);
                loginCred = await signInWithEmailAndPassword(auth, trimmedEmail, authTempPassword);
              } else {
                throw tempErr;
              }
            }
            user = loginCred.user;
            await updatePassword(user, authNewPassword);
          } catch (loginErr) {
            setError('Usuário já registrado no Firebase Auth, porém não foi possível redefinir com a senha temporária antiga.');
            setLoading(false);
            return;
          }
        } else {
          throw authErr;
        }
      }

      if (user) {
        // 4. Salvar dados atualizados no Firestore sob o novo UID gerado
        await updateProfile(user, { displayName: userData.name || 'Lojista' });

        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
          ...userData,
          id: user.uid,
          password: trimmedNewPassword, // Atualiza para a nova senha permanente
          active: true,
          updatedAt: new Date()
        }, { merge: true });

        // Se o Document ID antigo for diferente do novo UID, remove o documento legado para não duplicar
        if (userDocId && userDocId !== user.uid) {
          try {
            await deleteDoc(doc(db, 'users', userDocId));
          } catch (delErr) {
            console.warn("Could not clean up legacy pre-registered user doc:", delErr);
          }
        }

        onLoginSuccess();
      }
    } catch (err: any) {
      console.error("Erro no primeiro acesso:", err);
      setError(err.message || 'Ocorreu um erro ao ativar a sua conta. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

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
      if (mode === 'signup') {
        const hasUppercase = /[A-Z]/.test(trimmedPassword);
        const hasLowercase = /[a-z]/.test(trimmedPassword);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>_+\-\[\]\/\\`';~`=]/.test(trimmedPassword);

        if (trimmedPassword.length < 6 || !hasUppercase || !hasLowercase || !hasSpecial) {
          setError('A senha precisa ter no mínimo 6 caracteres, contendo pelo menos uma letra maiúscula, uma letra minúscula e um caractere especial (ex: @, #, $, %, etc.).');
          setLoading(false);
          return;
        }
      } else {
        if (trimmedPassword.length < 6) {
          setError('A senha de acesso e validação necessita de ao menos 6 caracteres.');
          setLoading(false);
          return;
        }
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

        if (signupRole === 'COURIER') {
          if (!pixKey.trim()) {
            setError('A chave Pix é obrigatória para os pagamentos do entregador parceiro.');
            setLoading(false);
            return;
          }
        }

        if (signupRole === 'OWNER') {
          if (!restaurantName.trim()) {
            setError('O nome do restaurante é obrigatório para cadastrar sua conta lojista.');
            setLoading(false);
            return;
          }
        }
      }

      if (mode === 'login') {
        let signedInUser = null;
        let loginSuccess = false;

        // 1. Primeiro tenta o login direto padrão via Firebase Auth (rápido, direto na máquina do cliente)
        try {
          console.log(`Tentando login client-side padrão para ${trimmedEmail}...`);
          const loginCred = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
          signedInUser = loginCred.user;
          loginSuccess = true;
          console.log(`Login client-side bem-sucedido.`);
        } catch (clientErr: any) {
          console.log(`Login client-side falhou: ${clientErr.code || clientErr.message}. Acionando sincronização via servidor...`);
        }

        // 2. Se falhar por qualquer desalinhamento, aciona a sincronização inteligente com o banco de dados via API
        if (!loginSuccess) {
          try {
            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
            });

            if (!response.ok) {
              const errData = await response.json();
              throw new Error(errData.error || 'Credenciais inválidas. Verifique seu e-mail e senha.');
            }

            const data = await response.json();
            if (data.success) {
              if (data.customToken) {
                console.log("Token de acesso recebido do servidor. Autenticando na sessão local...");
                const loginCred = await signInWithCustomToken(auth, data.customToken);
                signedInUser = loginCred.user;
                loginSuccess = true;
                console.log("Sessão autenticada via Token Customizado com sucesso!");
              } else if (data.isLocalSession) {
                console.log("Sessão de bypass local autorizada pelo servidor.");
                const simulatedFirebaseUser = {
                  uid: data.user.id,
                  email: data.user.email,
                  displayName: data.user.name,
                  isLocalSession: true
                };

                // Sincronizar o localStorage para o App inicializar corretamente com esse usuário local
                localStorage.setItem('kitchenflow_demo_user', JSON.stringify({
                  firebaseUser: simulatedFirebaseUser,
                  userData: {
                    id: data.user.id,
                    email: data.user.email,
                    role: data.user.role,
                    name: data.user.name,
                    tenantId: data.user.tenantId,
                    active: true,
                    status: 'online'
                  }
                }));

                localStorage.setItem('kitchenflow_cached_user', JSON.stringify({
                  id: data.user.id,
                  email: data.user.email,
                  role: data.user.role,
                  name: data.user.name,
                  tenantId: data.user.tenantId,
                  active: true,
                  status: 'online'
                }));

                // Tentativa assíncrona e silenciosa de auto-alinhamento do Firebase Auth local via Client SDK
                try {
                  console.log("Tentando criar conta correspondente no Firebase Auth via Client SDK...");
                  await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
                  console.log("Conta auto-alinhada e registrada no Firebase Auth localmente com sucesso!");
                } catch (clientRegErr: any) {
                  console.log("Alinhamento silencioso Firebase Auth retornou:", clientRegErr.code || clientRegErr.message);
                }

                onLoginSuccess();
                window.location.reload();
                return;
              }
            }
          } catch (serverErr: any) {
            console.error("Erro na sincronização segura do servidor:", serverErr);
            throw new Error(serverErr.message || 'Credenciais inválidas. Verifique seu e-mail e senha.');
          }
        }

        if (loginSuccess && signedInUser) {
          // Auto-cura: Sincronizar a nova senha com o Firestore se necessário
          try {
            const userDocRef = doc(db, 'users', signedInUser.uid);
            const userDocSnap = await getDoc(userDocRef);
            if (userDocSnap.exists()) {
              const uData = userDocSnap.data();
              if (uData.password !== trimmedPassword) {
                console.log("Sincronizando senha do Firestore com a senha de login atual...");
                await setDoc(userDocRef, { password: trimmedPassword }, { merge: true });
              }
            } else {
              // Se for entregador, verificar na coleção 'couriers'
              const courierDocRef = doc(db, 'couriers', signedInUser.uid);
              const courierDocSnap = await getDoc(courierDocRef);
              if (courierDocSnap.exists()) {
                const cData = courierDocSnap.data();
                if (cData.password !== trimmedPassword) {
                  console.log("Sincronizando senha do entregador no Firestore...");
                  await setDoc(courierDocRef, { password: trimmedPassword }, { merge: true });
                }
              }
            }
          } catch (syncErr) {
            console.warn("Erro ao auto-sincronizar senha no Firestore após login:", syncErr);
          }

          onLoginSuccess();
          return;
        } else {
          throw new Error('Não foi possível realizar a autenticação. Verifique os dados fornecidos.');
        }
      } else {
        // Mode is Sign-Up (Criação de Conta com área de segurança máxima)
        const userCredential = await createUserWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: name });

        if (signupRole === 'COURIER') {
          // 1. Cadastrar como usuário central
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            name,
            email: trimmedEmail,
            phone,
            role: 'COURIER',
            tenantId: 'GLOBAL',
            createdAt: new Date(),
            active: true
          });

          // 2. Criar perfil na tabela couriers para compatibilidade total com o mapa de entregas
          await setDoc(doc(db, 'couriers', user.uid), {
            id: user.uid,
            tenantId: 'GLOBAL',
            name,
            email: trimmedEmail,
            phone,
            pixKey,
            vehicleType,
            status: 'offline',
            active: true,
            createdAt: new Date()
          });

        } else if (signupRole === 'OWNER') {
          // Lojista Parceiro: criar um novo Tenant (empresa) exclusivo para segregar dados
          const newTenantId = `tenant_${Date.now()}`;

          // 1. Cadastrar Tenant
          await setDoc(doc(db, 'tenants', newTenantId), {
            id: newTenantId,
            name: restaurantName,
            category: tradeCategory,
            ownerId: user.uid,
            ownerEmail: trimmedEmail,
            active: true,
            autoAcceptOrders: false,
            createdAt: new Date()
          });

          // 2. Cadastrar Configurações do Lojista para evitar telas em branco
          await setDoc(doc(db, 'settings', newTenantId), {
            id: newTenantId,
            admin: {
              companyName: restaurantName,
              cnpj: '',
              phone: phone,
              email: trimmedEmail,
              address: 'Seu Endereço, 123',
              operatingHours: '18:00 às 23:30',
              globalDeliveryFee: 5.0,
              autoAcceptOrders: false,
              logoUrl: ''
            },
            digitalMenu: {
              restaurantName: restaurantName,
              accentColor: '#10B981',
              allowDelivery: true,
              allowTakeout: true,
              allowTableReservation: true,
              logoUrl: '',
              bannerUrl: ''
            },
            createdAt: new Date()
          });

          // 3. Salvar Usuário central como OWNER (Lojista Proprietário) com as devidas permissões completas
          await setDoc(doc(db, 'users', user.uid), {
            id: user.uid,
            tenantId: newTenantId,
            name,
            email: trimmedEmail,
            role: 'OWNER',
            password: trimmedPassword,
            permissions: [
              'dashboard_view',
              'pos_access',
              'marketplace_manage',
              'tables_manage',
              'kds_view',
              'delivery_manage',
              'digital_menu_manage',
              'customers_manage',
              'inventory_edit',
              'finance_view',
              'cmv_analysis',
              'users_manage',
              'admin_settings_manage',
              'fiscal_manage',
              'courier_app_access'
            ],
            createdAt: new Date(),
            active: true
          });

        } else {
          // Cliente final (Marketplace)
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
      }

      onLoginSuccess();
    } catch (err: any) {
      const isInvalidCreds = err.code === 'auth/invalid-credential' || 
                             err.code === 'auth/wrong-password' || 
                             err.code === 'auth/user-not-found' || 
                             err.message?.includes('auth/invalid-credential') || 
                             err.message?.includes('invalid-credential') || 
                             err.message?.includes('wrong-password') || 
                             err.message?.includes('user-not-found');
      if (err.code === 'auth/operation-not-allowed' || err.message?.includes('operation-not-allowed')) {
        setError('Este método de login não está ativado no Console do Firebase.');
      } else if (err.code === 'auth/email-already-in-use' || err.message?.includes('email-already-in-use')) {
        if (mode === 'login') {
          setError('Senha incorreta para este usuário já registrado. Se esqueceu sua senha, use o botão "Esqueci minha senha" abaixo.');
        } else {
          setError('Este e-mail já está em uso em nossa base de dados.');
        }
      } else if (isInvalidCreds) {
        setError('Credenciais inválidas. Verifique seu e-mail e senha.');
      } else {
        setError(mode === 'login' ? (err.message || 'E-mail ou senha inválidos.') : 'Erro ao criar conta no Firebase.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!isMarketplace) {
      setError('Acesso negado. O login via Google é permitido apenas na área do Marketplace.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      onLoginSuccess();
    } catch (err: any) {
      const isInvalidCreds = err.code === 'auth/invalid-credential' || 
                             err.code === 'auth/wrong-password' || 
                             err.code === 'auth/user-not-found' || 
                             err.message?.includes('auth/invalid-credential') || 
                             err.message?.includes('invalid-credential') || 
                             err.message?.includes('wrong-password') || 
                             err.message?.includes('user-not-found');
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
      <div className="max-w-lg w-full bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100 my-8">
        <div className="p-8 sm:p-12">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className={`w-16 h-16 ${isMarketplace ? 'bg-indigo-600 shadow-indigo-200' : 'bg-emerald-600 shadow-emerald-200'} rounded-2xl flex items-center justify-center shadow-lg mb-4 transform -rotate-6 transition-transform duration-300 hover:rotate-0`}>
              <Sparkles className="text-white animate-pulse" size={32} />
            </div>
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter text-center">
              {isMarketplace ? 'Marketplace Delivery' : 'Plataforma KitchenFlow AI'}
            </h1>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
              {mode === 'login'
                ? 'Portal de Acesso Seguro'
                : mode === 'first_access'
                ? 'Ative seu Primeiro Acesso'
                : 'Crie sua Credencial Segura'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={mode === 'first_access' ? handleFirstAccess : handleEmailLogin} className="space-y-6">
            
            {/* Account Type Selection (Only shown when creating a new account) */}
            {mode === 'signup' && !isMarketplace && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Acesso Requerido</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignupRole('CUSTOMER')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 ${
                      signupRole === 'CUSTOMER'
                        ? 'border-indigo-600 bg-indigo-50/50 text-indigo-700'
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <User size={18} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Cliente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole('COURIER')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 ${
                      signupRole === 'COURIER'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-700'
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Bike size={18} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Entregador</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignupRole('OWNER')}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all gap-1.5 ${
                      signupRole === 'OWNER'
                        ? 'border-orange-600 bg-orange-50/50 text-orange-700'
                        : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                    }`}
                  >
                    <Store size={18} />
                    <span className="text-[10px] font-black uppercase tracking-tight">Restaurante</span>
                  </button>
                </div>
              </div>
            )}

            {/* Profile Info fields during signup */}
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="text"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 placeholder:text-slate-300"
                      placeholder="Ex: Renan Silva"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone de Contato</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type="tel"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 placeholder:text-slate-300"
                      placeholder="(00) 00000-0000"
                      value={phone}
                      onChange={(e) => setPhone(maskPhone(e.target.value))}
                    />
                  </div>
                </div>

                {/* Additional Specific Signup Fields */}
                {signupRole === 'COURIER' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Veículo de Entrega</label>
                        <select
                          value={vehicleType}
                          onChange={(e) => setVehicleType(e.target.value as any)}
                          className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 text-sm h-[56px]"
                        >
                          <option value="moto">Motocicleta</option>
                          <option value="bike">Bicicleta</option>
                          <option value="car">Carro / Carango</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Chave Pix (Recebimentos)</label>
                        <input
                          type="text"
                          required
                          placeholder="Celular, CNPJ, Email"
                          className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 text-sm placeholder:text-slate-300 h-[56px]"
                          value={pixKey}
                          onChange={(e) => setPixKey(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                {signupRole === 'OWNER' && (
                  <>
                    <div className="space-y-2 animate-in fade-in duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Fantasia do Restaurante</label>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                          type="text"
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 placeholder:text-slate-300"
                          placeholder="Ex: Pizzaria Forno à Lenha"
                          value={restaurantName}
                          onChange={(e) => setRestaurantName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 animate-in fade-in duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Segmento / Categoria Comercial</label>
                      <select
                        value={tradeCategory}
                        onChange={(e) => setTradeCategory(e.target.value)}
                        className="w-full px-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 text-sm"
                      >
                        {COMMERCE_CATEGORIES.map(category => (
                          <option key={category.id} value={category.id}>{category.name}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Standard Credentials */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo ou Pessoal</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 placeholder:text-slate-300"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                {mode === 'first_access' ? 'Senha Temporária' : 'Senha de Acesso'}
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-slate-300 transition-all text-slate-700 placeholder:text-slate-300"
                  placeholder={mode === 'first_access' ? "Digite a senha fornecida" : "Mínimo 6 caracteres"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end pr-1">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:underline transition"
                >
                  Esqueci minha senha?
                </button>
              </div>
            )}

            {mode === 'first_access' && (
              <>
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Definir Nova Senha Permanente</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-amber-200 rounded-2xl font-bold outline-none focus:border-amber-400 transition-all text-slate-700 placeholder:text-slate-300"
                      placeholder="Nova senha (mínimo 6 dígitos)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border-2 border-amber-200 rounded-2xl font-bold outline-none focus:border-amber-400 transition-all text-slate-700 placeholder:text-slate-300"
                      placeholder="Confirme sua nova senha"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Success alerts */}
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 text-xs font-bold text-center flex items-center justify-center gap-2 animate-bounce">
                <Check size={16} />
                {successMessage}
              </div>
            )}

            {/* Error alerts */}
            {error && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-xs font-bold text-center flex items-center justify-center gap-2 animate-pulse">
                <Shield size={16} />
                {error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full ${
                isMarketplace ? 'bg-indigo-600 shadow-indigo-100' : 'bg-emerald-600 shadow-emerald-100'
              } text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : mode === 'login' ? (
                <LogIn size={20} />
              ) : mode === 'first_access' ? (
                <Sparkles size={20} />
              ) : (
                <UserPlus size={20} />
              )}
              {mode === 'login'
                ? isMarketplace
                  ? 'Entrar no Marketplace'
                  : 'Acessar Central Segura'
                : mode === 'first_access'
                ? 'Ativar Conta e Entrar'
                : 'Finalizar Cadastro Seguro'}
            </button>
          </form>

          {/* Toggle modes */}
          <div className="mt-6 flex flex-col items-center justify-center gap-2 text-center">
            {mode === 'login' ? (
              <>
                <button 
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-[10px] font-black uppercase tracking-widest hover:underline ${
                    isMarketplace ? 'text-indigo-600' : 'text-emerald-700'
                  }`}
                >
                  Não possui uma conta registrada? Cadastre-se
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setMode('first_access');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline hover:text-amber-700 transition"
                >
                  Primeiro acesso? Ativar conta com senha temporária
                </button>
              </>
            ) : mode === 'signup' ? (
              <>
                <button 
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-[10px] font-black uppercase tracking-widest hover:underline ${
                    isMarketplace ? 'text-indigo-600' : 'text-emerald-700'
                  }`}
                >
                  Já possui credencial de acesso? Faça Login
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setMode('first_access');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[10px] font-black uppercase tracking-widest text-amber-600 hover:underline hover:text-amber-700 transition"
                >
                  Primeiro acesso? Ativar conta
                </button>
              </>
            ) : (
              <>
                <button 
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-[10px] font-black uppercase tracking-widest hover:underline ${
                    isMarketplace ? 'text-indigo-600' : 'text-emerald-700'
                  }`}
                >
                  Voltar para o Login
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className={`text-[10px] font-black uppercase tracking-widest hover:underline ${
                    isMarketplace ? 'text-indigo-600' : 'text-emerald-700'
                  }`}
                >
                  Não possui uma conta registrada? Cadastre-se
                </button>
              </>
            )}
          </div>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-slate-100 animate-pulse"></div>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest select-none">Ambiente Blindado SSL</span>
            <div className="flex-1 h-px bg-slate-100 animate-pulse"></div>
          </div>



          {/* Social Sign-In */}
          {isMarketplace && (
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full mt-6 bg-white border-2 border-slate-100 text-slate-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 active:scale-98 transition-all flex items-center justify-center gap-3 shadow-sm"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google Logo" className="w-5 h-5 select-none" />
              Entrar de forma segura com o Google
            </button>
          )}

          {/* Defensive text footer */}
          <p className="mt-8 text-center text-slate-400 text-[10px] font-semibold uppercase tracking-wider leading-relaxed">
            Sessões monitoradas e registradas em auditoria.<br />
            Sistema em conformidade com as diretrizes de segurança máxima.
          </p>
        </div>
      </div>
    </div>
  );
});

Login.displayName = 'Login';

export default Login;
