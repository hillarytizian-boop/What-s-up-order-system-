import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChefHat, Lock, User, Shield, Eye, EyeOff, AlertTriangle, Smartphone, ArrowLeft, CheckCircle2, KeyRound, Info } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { adminDB } from '../store/db';
import { verifyPassword, verifyTOTP, checkRateLimit, recordFailedAttempt, clearRateLimit, generateTOTP, getOrCreateCSRFToken } from '../utils/security';
import { Session } from '../types';

type LoginStep = 'credentials' | '2fa';

export default function AdminLogin() {
  const { setSession, session, showToast } = useApp();
  const navigate = useNavigate();

  const [step, setStep] = useState<LoginStep>('credentials');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingAdmin, setPendingAdmin] = useState<{ id: string; username: string; secret: string; role: 'admin' | 'staff' } | null>(null);
  const [demoCode, setDemoCode] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const csrfToken = getOrCreateCSRFToken();
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session?.twoFactorVerified) {
      navigate(session.role === 'admin' ? '/admin' : '/staff');
    }
  }, [session, navigate]);

  useEffect(() => {
    if (!pendingAdmin?.secret) return;
    const update = async () => {
      const code = await generateTOTP(pendingAdmin.secret);
      setDemoCode(code);
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [pendingAdmin]);

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const rateLimitKey = `login:${username.toLowerCase()}`;
    const limit = checkRateLimit(rateLimitKey);
    if (!limit.allowed) {
      const mins = Math.ceil(((limit.lockedUntil || 0) - Date.now()) / 60000);
      setError(`Too many failed attempts. Try again in ${mins} minute(s).`);
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const admin = adminDB.getByUsername(username.trim());
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      recordFailedAttempt(rateLimitKey);
      setError(`Invalid credentials. ${limit.remaining - 1} attempt(s) remaining.`);
      setLoading(false);
      return;
    }
    clearRateLimit(rateLimitKey);
    setPendingAdmin({ id: admin.id, username: admin.username, secret: admin.twoFactorSecret, role: admin.role });
    setLoading(false);
    setStep('2fa');
    setTimeout(() => codeInputRef.current?.focus(), 100);
  };

  const handle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!pendingAdmin) return;
    if (totpCode.length !== 6 || !/^\d{6}$/.test(totpCode)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    const valid = await verifyTOTP(pendingAdmin.secret, totpCode);
    if (!valid) {
      setError('Invalid code. Please try again.');
      setTotpCode('');
      setLoading(false);
      return;
    }
    const session: Session = {
      adminId: pendingAdmin.id,
      username: pendingAdmin.username,
      role: pendingAdmin.role,
      createdAt: Date.now(),
      twoFactorVerified: true,
    };
    setSession(session);
    showToast('success', `Welcome back, ${pendingAdmin.username}!`);
    navigate(pendingAdmin.role === 'admin' ? '/admin' : '/staff');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      </div>
      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-orange-500/30 mb-4">
            <ChefHat className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">TableBite</h1>
          <p className="text-gray-400 text-sm mt-1">Secure Staff Portal</p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'credentials' && (
            <motion.div key="creds" initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <h2 className="text-white font-bold text-xl mb-1">Sign In</h2>
                <p className="text-gray-400 text-sm mb-6">Enter your staff credentials to continue</p>
                <form onSubmit={handleCredentials} className="space-y-4">
                  <input type="hidden" name="_csrf" value={csrfToken} />
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Username</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type="text" value={username} onChange={e => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30))} autoComplete="username" className="w-full bg-white/10 border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="admin" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value.slice(0, 100))} autoComplete="current-password" className="w-full bg-white/10 border border-white/10 text-white placeholder:text-gray-500 pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {error && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2.5 rounded-xl text-sm"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</motion.div>}
                  <button type="submit" disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-orange-500/30">{loading ? 'Verifying...' : 'Continue →'}</button>
                </form>
                <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-2"><Info className="w-3.5 h-3.5 text-blue-400" /><span className="text-blue-300 text-xs font-semibold">Demo Credentials</span></div>
                  <div className="space-y-1 text-xs text-blue-200/70">
                    <p><span className="text-blue-300 font-mono">admin</span> / <span className="text-blue-300 font-mono">Admin@TableBite2024!</span> — Full access</p>
                    <p><span className="text-blue-300 font-mono">staff</span> / <span className="text-blue-300 font-mono">Staff@TableBite2024!</span> — Orders only</p>
                    <p className="text-blue-300/50 italic mt-1">For 2FA: check browser console for the TOTP code</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === '2fa' && pendingAdmin && (
            <motion.div key="2fa" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl">
                <button onClick={() => { setStep('credentials'); setError(''); setTotpCode(''); }} className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4"><ArrowLeft className="w-4 h-4" /> Back</button>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center"><Smartphone className="w-5 h-5 text-blue-400" /></div>
                  <div><h2 className="text-white font-bold text-lg">Two-Factor Auth</h2><p className="text-gray-400 text-sm">Signed in as <span className="text-white font-medium">{pendingAdmin.username}</span></p></div>
                </div>
                <p className="text-gray-300 text-sm mb-4">Enter the 6-digit code from your authenticator app.</p>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-amber-400" /><span className="text-amber-300 text-xs font-semibold">Demo Code</span></div>
                    <button onClick={() => setShowDemo(!showDemo)} className="text-amber-400 text-xs">{showDemo ? 'Hide' : 'Show'}</button>
                  </div>
                  {showDemo && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}>
                      <div className="mt-2 flex items-center justify-between"><span className="text-amber-100 font-mono text-2xl font-bold tracking-widest">{demoCode}</span><button type="button" onClick={() => { setTotpCode(demoCode); codeInputRef.current?.focus(); }} className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1.5 rounded-lg">Auto-fill</button></div>
                    </motion.div>
                  )}
                </div>
                <form onSubmit={handle2FA} className="space-y-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-1.5">6-Digit Code</label>
                    <input ref={codeInputRef} type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-white/10 border border-white/10 text-white placeholder:text-gray-500 px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-3xl font-black tracking-[0.5em] font-mono" placeholder="000000" autoComplete="one-time-code" />
                  </div>
                  {error && <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-300 px-3 py-2.5 rounded-xl text-sm"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</motion.div>}
                  <button type="submit" disabled={loading || totpCode.length !== 6} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl transition-colors shadow-lg shadow-blue-500/20">{loading ? 'Verifying...' : <span className="flex items-center justify-center gap-2"><CheckCircle2 className="w-4 h-4" /> Verify & Sign In</span>}</button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-center mt-6"><Link to="/" className="text-gray-500 hover:text-gray-300 text-sm flex items-center justify-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to customer menu</Link></div>
      </div>
    </div>
  );
}
