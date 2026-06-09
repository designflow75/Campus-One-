"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { User, Mail, Lock, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          role: 'PARENT', // Default signup role is PARENT
        }),
      });

      // Redirect to login page with query parameter
      router.push('/login?registered=true');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Custom NFC Logo SVG
  const LogoSvg = () => (
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
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden px-4 font-sans">
      {/* Background radial glow blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[450px] h-[450px] bg-indigo-500/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 text-slate-100 z-10 animate-float">
        
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-3">
            <LogoSvg />
          </div>
          <h1 className="text-3xl font-bold font-heading tracking-tight bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
            Parent Registration
          </h1>
          <p className="text-xs text-slate-450 mt-1">Create a parent account to manage your child's canteen wallet</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5">
          {/* Full Name Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Mercer"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 placeholder-slate-600 transition"
              />
            </div>
          </div>

          {/* Email Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@school.com"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 placeholder-slate-600 transition"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 placeholder-slate-600 transition"
              />
            </div>
          </div>

          {/* Confirm Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 focus:border-emerald-500 focus:outline-none text-xs text-slate-200 placeholder-slate-600 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 mt-4 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-semibold hover:opacity-95 shadow-md shadow-emerald-500/10 cursor-pointer disabled:opacity-50 transition text-xs"
          >
            {loading ? 'Creating account...' : 'Create Account'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Link back to signin */}
        <div className="mt-6 border-t border-slate-900/60 pt-5 text-center">
          <p className="text-xs text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-400 hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
