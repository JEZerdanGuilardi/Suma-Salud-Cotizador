import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, LogIn, Loader2, Mail, ArrowLeft, KeyRound, CheckCircle2, Lock } from 'lucide-react';

export function LoginScreen() {
  const { signIn, resetPassword, updatePassword, passwordRecovery, clearPasswordRecovery } = useAuth();
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await signIn(email.trim(), password);
    if (error) setError(error);
    setBusy(false);
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setBusy(true);
    const { error } = await resetPassword(resetEmail.trim());
    if (error) setError(error);
    else {
      setInfo('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña en los próximos minutos.');
      setResetEmail('');
    }
    setBusy(false);
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setBusy(true);
    const { error } = await updatePassword(newPassword);
    if (error) {
      setError(error);
    } else {
      setInfo('Contraseña actualizada correctamente. Ya puedes iniciar sesión con tu nueva clave.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        clearPasswordRecovery();
        setInfo(null);
      }, 2500);
    }
    setBusy(false);
  }

  if (passwordRecovery) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 mb-4">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Nueva contraseña</h1>
            <p className="text-slate-400 text-sm mt-1">Ingresa tu nueva contraseña para continuar</p>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Nueva contraseña</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1.5">Confirmar contraseña</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                  placeholder="Repite la nueva contraseña"
                />
              </div>

              {error && (
                <div className="text-sm rounded-lg px-3 py-2 bg-red-500/10 text-red-300 border border-red-500/30">
                  {error}
                </div>
              )}

              {info && (
                <div className="text-sm rounded-lg px-3 py-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> {info}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                <Lock className="w-4 h-4" /> Actualizar contraseña
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Cotizador Movil</h1>
          <p className="text-slate-400 text-sm mt-1">Gestión de cotizaciones de obras sociales</p>
        </div>

        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {mode === 'login' ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                    placeholder="vendedor@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="text-sm rounded-lg px-3 py-2 bg-red-500/10 text-red-300 border border-red-500/30">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <LogIn className="w-4 h-4" /> Iniciar sesión
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  onClick={() => { setMode('reset'); setError(null); setInfo(null); }}
                  className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-teal-400 transition-all"
                >
                  <KeyRound className="w-3.5 h-3.5" /> ¿Olvidaste tu contraseña?
                </button>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800">
                <p className="text-xs text-slate-500 text-center">
                  ¿Eres usuario nuevo? Contacta a administración para obtener tus credenciales.
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-6">
                <button
                  onClick={() => { setMode('login'); setError(null); setInfo(null); }}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <h2 className="text-lg font-semibold text-white">Recuperar contraseña</h2>
              </div>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1.5">Correo electrónico</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                    placeholder="vendedor@email.com"
                  />
                </div>

                {error && (
                  <div className="text-sm rounded-lg px-3 py-2 bg-red-500/10 text-red-300 border border-red-500/30">
                    {error}
                  </div>
                )}

                {info && (
                  <div className="text-sm rounded-lg px-3 py-2 bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    {info}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg shadow-teal-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                  <Mail className="w-4 h-4" /> Enviar enlace de recuperación
                </button>

                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setInfo(null); }}
                  className="w-full text-slate-400 hover:text-white text-sm font-medium py-2.5 rounded-lg transition-all"
                >
                  Volver al Login
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
