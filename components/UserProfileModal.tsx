import React, { useState, useRef } from 'react';
import { 
  X, 
  User as UserIcon, 
  Mail, 
  Key, 
  Camera, 
  Upload, 
  Check, 
  Eye, 
  EyeOff, 
  Loader2, 
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  updateEmail, 
  updatePassword, 
  updateProfile, 
  reauthenticateWithCredential, 
  EmailAuthProvider 
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User } from '../types';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserData: User | null;
  onUpdateUser: (updatedData: User) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

const getDeterministicPassword = (emailStr: string) => {
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

// Collection of elegant preselected avatars (with colors & emojis)
const PRESET_AVATARS = [
  { url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80', label: 'Pro 1' },
  { url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&h=256&q=80', label: 'Pro 2' },
  { url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&h=256&q=80', label: 'Pro 3' },
  { url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&h=256&q=80', label: 'Pro 4' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix', label: 'Felix' },
  { url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka', label: 'Aneka' },
  { url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Robo', label: 'Robo' },
  { url: 'https://api.dicebear.com/7.x/fun-emoji/svg?seed=Happy', label: 'Fun' },
];

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUserData,
  onUpdateUser,
  showToast
}) => {
  const [name, setName] = useState(currentUserData?.name || '');
  const [email, setEmail] = useState(currentUserData?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatar, setAvatar] = useState(currentUserData?.avatar || '');
  const [useCustomUrl, setUseCustomUrl] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  
  // Show/hide passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showReauthPassword, setShowReauthPassword] = useState(false);

  // States for operation and re-auth required
  const [loading, setLoading] = useState(false);
  const [reauthRequired, setReauthRequired] = useState(false);
  const [currentPasswordForReauth, setCurrentPasswordForReauth] = useState('');
  const [reauthLoading, setReauthLoading] = useState(false);
  const [reauthSuccess, setReauthSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Handle local image file upload & convert to base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToast('A imagem deve ter no máximo 2MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      setAvatar(base64String);
      showToast('Foto carregada com sucesso!', 'success');
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Re-auth trigger
  const handleReauthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPasswordForReauth) {
      showToast('Por favor, informe sua senha atual.', 'error');
      return;
    }

    setReauthLoading(true);
    try {
      const fbUser = auth.currentUser;
      if (!fbUser || !fbUser.email) {
        throw new Error('Nenhum usuário autenticado encontrado');
      }

      // If user is staff, validate current password locally against Firestore first
      const isStaff = currentUserData && currentUserData.role !== 'CUSTOMER';
      if (isStaff && currentUserData && currentUserData.password && currentUserData.password !== currentPasswordForReauth) {
        throw { code: 'auth/invalid-credential', message: 'Senha atual incorreta.' };
      }

      // Tenta reautenticar com a senha real digitada, e caso falhe tenta a determinística legado (fallback)
      try {
        const credential = EmailAuthProvider.credential(fbUser.email, currentPasswordForReauth);
        await reauthenticateWithCredential(fbUser, credential);
      } catch (err: any) {
        if (isStaff) {
          try {
            const legacyPass = getDeterministicPassword(fbUser.email);
            const credential = EmailAuthProvider.credential(fbUser.email, legacyPass);
            await reauthenticateWithCredential(fbUser, credential);
          } catch (legacyErr) {
            throw err;
          }
        } else {
          throw err;
        }
      }

      setReauthSuccess(true);
      setReauthRequired(false);
      showToast('Segurança confirmada! Prossiga com o salvamento.', 'success');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.message?.includes('invalid-credential')) {
        showToast('Senha atual incorreta. Digite sua senha atual corretamente.', 'error');
      } else {
        showToast(err.message || 'Erro ao reautenticar.', 'error');
      }
    } finally {
      setReauthLoading(false);
    }
  };

  // Main Save Submission
  const handleSave = async () => {
    if (!name.trim()) {
      showToast('O nome não pode estar vazio', 'error');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      showToast('Por favor, insira um e-mail válido', 'error');
      return;
    }

    if (password) {
      const hasUpper = /[A-Z]/.test(password);
      const hasLower = /[a-z]/.test(password);
      const hasSpec = /[!@#$%^&*(),.?":{}|<>_+\-\[\]\/\\`';~`=]/.test(password);
      if (password.length < 6 || !hasUpper || !hasLower || !hasSpec) {
        showToast('A nova senha precisa ter no mínimo 6 caracteres, contendo pelo menos uma letra maiúscula, uma letra minúscula e um caractere especial (ex: @, #, $, %, etc.).', 'error');
        return;
      }
    }

    if (password && password !== confirmPassword) {
      showToast('As senhas digitadas não coincidem', 'error');
      return;
    }

    setLoading(true);
    try {
      const fbUser = auth.currentUser;
      if (!fbUser) throw new Error('Usuário não autenticado.');

      // 1. Update Profile (DisplayName and Photo)
      const selectedAvatar = useCustomUrl ? customAvatarUrl : avatar;
      await updateProfile(fbUser, {
        displayName: name,
        photoURL: selectedAvatar || null
      });

      // 2. Update Email locally if changed
      let emailChanged = false;
      const cleanEmail = email.trim().toLowerCase();
      if (cleanEmail !== fbUser.email) {
        try {
          await updateEmail(fbUser, cleanEmail);
          emailChanged = true;
        } catch (err: any) {
          if (err.code === 'auth/requires-recent-login') {
            setReauthRequired(true);
            setLoading(false);
            showToast('Por motivos de segurança, você precisa confirmar sua senha atual antes de alterar o e-mail.', 'info');
            return;
          }
          throw err;
        }
      }

      // 3. Update Password if changed
      let passwordChanged = false;
      if (password) {
        try {
          const authPassword = password;
          await updatePassword(fbUser, authPassword);
          passwordChanged = true;
        } catch (err: any) {
          if (err.code === 'auth/requires-recent-login') {
            setReauthRequired(true);
            setLoading(false);
            showToast('Por motivos de segurança, você precisa confirmar sua senha atual antes de alterar a senha.', 'info');
            return;
          }
          throw err;
        }
      }

      // 4. Update user document on Firestore
      if (currentUserData) {
        const userDocRef = doc(db, 'users', fbUser.uid);
        const updatedData: any = {
          name,
          email: cleanEmail,
          avatar: selectedAvatar || '',
          photoURL: selectedAvatar || '',
          updatedAt: new Date()
        };

        if (password) {
          updatedData.password = password;
        }

        await updateDoc(userDocRef, updatedData);
        onUpdateUser({
          ...currentUserData,
          ...updatedData
        } as User);
      }

      showToast('Perfil atualizado com sucesso!', 'success');
      // Reset sensitive states
      setPassword('');
      setConfirmPassword('');
      setReauthSuccess(false);
      onClose();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential' || err.message?.includes('invalid-credential')) {
        showToast('Credenciais de autenticação inválidas ou expiradas.', 'error');
      } else {
        showToast(err.message || 'Erro ao atualizar perfil', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 border border-indigo-100/50 px-2.5 py-0.5 rounded-full">
              Configurações Pessoais
            </span>
            <h3 className="text-xl font-black text-slate-800 tracking-tight mt-1.5">Editar Meu Perfil</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2.5 bg-white border border-slate-100 text-slate-400 hover:text-slate-600 rounded-full shadow-sm hover:shadow transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 custom-scrollbar">

          {/* Re-authentication Form Barrier */}
          {reauthRequired && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-amber-50 border border-amber-200 rounded-3xl"
            >
              <div className="flex items-start gap-3">
                <ShieldAlert className="text-amber-500 shrink-0 mt-0.5" size={20} />
                <div className="flex-1 space-y-3">
                  <h4 className="text-xs font-black text-amber-800 uppercase tracking-widest">Confirmação de Segurança</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-semibold">
                    Para alterar seu e-mail ou senha, o Firebase exige que você reconfirme suas credenciais de login. Escreva sua senha atual abaixo para prosseguir.
                  </p>
                  <form onSubmit={handleReauthenticate} className="flex gap-2 max-w-md">
                    <div className="relative flex-1">
                      <Key className="absolute left-3 top-2.5 text-slate-400" size={16} />
                      <input 
                        type={showReauthPassword ? "text" : "password"}
                        value={currentPasswordForReauth}
                        onChange={(e) => setCurrentPasswordForReauth(e.target.value)}
                        placeholder="Sua senha de login atual"
                        className="w-full pl-9 pr-9 py-2 rounded-xl text-xs border border-slate-200 outline-none focus:border-indigo-500 transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowReauthPassword(!showReauthPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showReauthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={reauthLoading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer hover:bg-indigo-700 transition-all disabled:opacity-50"
                    >
                      {reauthLoading ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      Confirmar
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          )}

          {/* Profile Photo Editor Block */}
          <div className="space-y-3">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Foto de Perfil</label>
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-slate-50/50 rounded-3xl border border-slate-100">
              
              {/* Profile Photo Preview with Upload Trigger */}
              <div className="relative group cursor-pointer" onClick={triggerFileSelect}>
                <div className="w-24 h-24 rounded-3xl bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center overflow-hidden shadow-md">
                  {avatar ? (
                    <img src={avatar} className="w-full h-full object-cover" alt="Avatar Preview" referrerPolicy="no-referrer" />
                  ) : (
                    <span className="text-xl font-black text-indigo-500 uppercase">
                      {name ? name.substring(0, 2) : 'A'}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="text-white" size={24} />
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden" 
                />
              </div>

              {/* Selection Options */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500">Escolha um avatar ou envie sua imagem:</span>
                  <button 
                    type="button" 
                    onClick={() => setUseCustomUrl(!useCustomUrl)}
                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline cursor-pointer"
                  >
                    {useCustomUrl ? 'Ver Presets de Avatar' : 'Usar link de Imagem'}
                  </button>
                </div>

                {!useCustomUrl ? (
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                    {PRESET_AVATARS.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAvatar(p.url);
                          showToast(`Avatar ${p.label} selecionado`, 'info');
                        }}
                        className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all shadow-sm ${avatar === p.url ? 'border-indigo-600 scale-105 shadow-md shadow-indigo-100' : 'border-white hover:border-slate-200'}`}
                      >
                        <img src={p.url} className="w-full h-full object-cover" alt={p.label} referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="text"
                      value={customAvatarUrl}
                      onChange={(e) => {
                        setCustomAvatarUrl(e.target.value);
                        setAvatar(e.target.value);
                      }}
                      placeholder="https://exemplo.com/sua-foto.png"
                      className="w-full px-3 py-2 border rounded-xl text-xs outline-none bg-white focus:border-indigo-500"
                    />
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={triggerFileSelect}
                    className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 transition-all cursor-pointer bg-white"
                  >
                    <Upload size={12} />
                    Enviar Imagem Local
                  </button>
                  {avatar && (
                    <button
                      type="button"
                      onClick={() => setAvatar('')}
                      className="px-3 py-1.5 text-rose-500 hover:bg-rose-50 rounded-xl text-[10px] uppercase font-black tracking-widest flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Form Fields container */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Field: Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">Nome Completo</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 outline-none bg-white focus:border-indigo-500 transition-all text-xs font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Field: Email */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 text-slate-400" size={16} />
                <input 
                  type="email"
                  value={email}
                  disabled={loading}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@restaurante.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 outline-none bg-white focus:border-indigo-500 transition-all text-xs font-semibold text-slate-700 disabled:bg-slate-50"
                />
              </div>
            </div>

          </div>

          {/* Password Reset Block */}
          <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
            <div>
              <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Alterar Senha de Acesso</h4>
              <p className="text-[9px] text-slate-400 mt-0.5">Preencha apenas se desejar cadastrar uma nova senha.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Field: New Password */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block ml-1">Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 transition-all text-xs font-semibold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Field: Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider block ml-1">Confirmar Nova Senha</label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-2.5 text-slate-400" size={15} />
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200 outline-none bg-white focus:border-indigo-500 transition-all text-xs font-semibold text-slate-700"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-2xl text-xs sm:text-[10px] font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs sm:text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:shadow-xl transition-all border-b-4 border-indigo-800 active:translate-y-[2px] active:border-b-0 flex items-center gap-1.5 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check size={13} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>

      </motion.div>
    </div>
  );
};
