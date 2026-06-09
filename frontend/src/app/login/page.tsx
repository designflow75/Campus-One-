"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { Shield, Users, ShoppingBag, Lock, Mail, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'PARENT' | 'STAFF' | 'ADMIN'>('PARENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('registered') === 'true') {
      setRegistered(true);
    }
  }, []);

  const handleAutofill = (selectedRole: typeof role) => {
    setRole(selectedRole);
    if (selectedRole === 'ADMIN') {
      setEmail('admin@campusone.com');
      setPassword('admin123');
    } else if (selectedRole === 'PARENT') {
      setEmail('parent@gmail.com');
      setPassword('parent123');
    } else {
      setEmail('staff@canteen.com');
      setPassword('staff123');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // Check role mismatch
      if (data.user.role !== role) {
        throw new Error(`Account registered as ${data.user.role}, not ${role}`);
      }

      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      // Redirect to correct dashboard
      if (role === 'ADMIN') {
        router.push('/admin');
      } else if (role === 'PARENT') {
        router.push('/subscription');
      } else {
        router.push('/staff');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4">
      {/* Background radial glow blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 text-slate-100 z-10 animate-float">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-emerald-400">
              <path d="M 35 15 A 35 35 0 0 0 15 50" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M 42 22 A 28 28 0 0 0 22 50" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <path d="M 49 29 A 21 21 0 0 0 29 50" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              <g transform="rotate(-15 60 50)">
                <rect x="46" y="36" width="30" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="3.5" />
                <rect x="50" y="42" width="5" height="4" fill="currentColor" />
                <line x1="46" y1="49" x2="76" y2="49" stroke="currentColor" strokeWidth="1.5" />
              </g>
              <path d="M 68 54 C 72 58, 76 62, 78 68 C 79 72, 77 75, 73 75 C 69 75, 64 71, 61 69 L 55 64" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold font-heading tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
            CampusOne
          </h1>
          <p className="text-sm text-slate-400 mt-1">Cashless Canteen & Meal Nutrition</p>
        </div>

        {/* Role Selectors */}
        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleAutofill('PARENT')}
            className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
              role === 'PARENT'
                ? 'bg-gradient-to-tr from-emerald-600 to-emerald-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs font-semibold">Parent</span>
          </button>
          <button
            type="button"
            onClick={() => handleAutofill('STAFF')}
            className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
              role === 'STAFF'
                ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-5 h-5 mb-1" />
            <span className="text-xs font-semibold">Staff</span>
          </button>
          <button
            type="button"
            onClick={() => handleAutofill('ADMIN')}
            className={`flex flex-col items-center justify-center py-3 rounded-lg transition-all ${
              role === 'ADMIN'
                ? 'bg-gradient-to-tr from-purple-600 to-purple-500 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-5 h-5 mb-1" />
            <span className="text-xs font-semibold">Admin</span>
          </button>
        </div>

        {registered && (
          <div className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-sm text-center font-bold">
            Account created successfully! Please sign in.
          </div>
        )}

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-emerald-500 focus:outline-none text-slate-200 placeholder-slate-600 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
                Password
              </label>
              <a href="#" className="text-xs text-emerald-400 hover:underline">Forgot password?</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-emerald-500 focus:outline-none text-slate-200 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-semibold hover:opacity-95 shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50 transition"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Demo Quick login links */}
        <div className="mt-8 border-t border-slate-800/80 pt-6 text-center">
          <p className="text-xs text-slate-500 font-semibold mb-3">DEMO AUTO-FILL ACCOUNTS</p>
          <div className="flex justify-center gap-2.5">
            <button
              onClick={() => handleAutofill('PARENT')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/40 transition cursor-pointer"
            >
              Parent
            </button>
            <button
              onClick={() => handleAutofill('STAFF')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-indigo-500/40 transition cursor-pointer"
            >
              Staff
            </button>
            <button
              onClick={() => handleAutofill('ADMIN')}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-purple-500/40 transition cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>

        {/* Parent registration link */}
        <div className="mt-6 border-t border-slate-900/60 pt-4 text-center">
          <p className="text-xs text-slate-500">
            Don't have an account?{' '}
            <Link href="/register" className="text-emerald-400 hover:underline font-semibold">
              Register here
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
