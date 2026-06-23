import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Mail, Lock, LogIn, Chrome, ShieldAlert, Check } from 'lucide-react';
import { setCredentials } from '../store/authSlice.js';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials fields.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed.');
      }

      dispatch(setCredentials({ user: data.user, token: data.token }));
      
      // Navigate based on user role
      if (data.user.role === 'admin') navigate('/admin');
      else if (data.user.role === 'owner') navigate('/owner');
      else if (data.user.role === 'rider') navigate('/rider');
      else navigate('/restaurants');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'google_user@hungryhub.com',
          name: 'Sarah Jenkins',
          picture: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100'
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate('/restaurants');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('password123');
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-gradient-to-tr from-amber-500/5 via-stone-50 to-rose-500/5 dark:from-zinc-950 dark:to-zinc-900 transition-colors">
      <div className="w-full max-w-md p-8 rounded-3xl glass-panel-light dark:glass-panel-dark shadow-2xl relative">
        <div className="text-center mb-8">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-md mb-3">
            H
          </span>
          <h2 className="text-2xl font-black tracking-tight text-stone-800 dark:text-white">Welcome Back</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Delivering Happiness, One Bite at a Time.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
              />
              <Mail className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
              />
              <Lock className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <LogIn size={16} /> {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <span className="absolute inset-x-0 top-3 border-b border-stone-200 dark:border-zinc-800/80"></span>
          <span className="relative px-3 py-0.5 bg-stone-100 dark:bg-zinc-950 text-xs text-stone-400 dark:text-zinc-600 rounded-md font-semibold">OR</span>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-3 border border-stone-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/30 hover:bg-white/60 dark:hover:bg-zinc-900/50 text-stone-700 dark:text-stone-300 font-semibold text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
        >
          <Chrome size={16} className="text-red-500" /> Continue with Google
        </button>

        {/* Developer Sandbox Logins */}
        <div className="mt-8 pt-6 border-t border-stone-200 dark:border-zinc-800/80">
          <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-3 text-center">Quick Sandbox Accounts</p>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => fillCredentials('customer@hungryhub.com')} className="text-left p-2 rounded-xl border border-stone-200 dark:border-zinc-800 text-[11px] hover:bg-stone-50 dark:hover:bg-zinc-900 flex justify-between items-center text-stone-600 dark:text-stone-300">
              <span>Customer</span>
              <Check size={12} className="text-orange-500" />
            </button>
            <button type="button" onClick={() => fillCredentials('owner@hungryhub.com')} className="text-left p-2 rounded-xl border border-stone-200 dark:border-zinc-800 text-[11px] hover:bg-stone-50 dark:hover:bg-zinc-900 flex justify-between items-center text-stone-600 dark:text-stone-300">
              <span>Chef Owner</span>
              <Check size={12} className="text-orange-500" />
            </button>
            <button type="button" onClick={() => fillCredentials('rider@hungryhub.com')} className="text-left p-2 rounded-xl border border-stone-200 dark:border-zinc-800 text-[11px] hover:bg-stone-50 dark:hover:bg-zinc-900 flex justify-between items-center text-stone-600 dark:text-stone-300">
              <span>Delivery Rider</span>
              <Check size={12} className="text-orange-500" />
            </button>
            <button type="button" onClick={() => fillCredentials('admin@hungryhub.com')} className="text-left p-2 rounded-xl border border-stone-200 dark:border-zinc-800 text-[11px] hover:bg-stone-50 dark:hover:bg-zinc-900 flex justify-between items-center text-stone-600 dark:text-stone-300">
              <span>Super Admin</span>
              <Check size={12} className="text-orange-500" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-stone-500 dark:text-stone-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-500 hover:text-orange-600 font-bold">Register</Link>
        </p>
      </div>
    </div>
  );
}
