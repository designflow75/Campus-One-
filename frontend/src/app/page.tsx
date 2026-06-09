import Link from 'next/link';
import { CreditCard, HeartPulse, ShieldCheck, ArrowRight, Activity, Users } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <header className="border-b border-slate-900 px-6 py-4 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-10 h-10 text-emerald-400 flex-shrink-0">
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
            <span className="text-xl font-bold font-heading bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              CampusOne
            </span>
          </div>

          <Link
            href="/login"
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 font-semibold hover:border-emerald-500/40 transition-all text-sm"
          >
            Sign In
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col justify-center px-6 py-20">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            <span>NFC Cashless Meal Payments for Schools</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-extrabold font-heading tracking-tight max-w-4xl mx-auto leading-tight">
            Cashless Student Meals. <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
              Automatic Nutrition Tracking.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-normal">
            CampusOne connects parents, canteen staff, and school admins. Manage student wallet spending, limit junk food purchases, and trace macronutrient values in real time.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-4">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white font-bold hover:opacity-95 shadow-lg shadow-emerald-500/15 flex items-center justify-center gap-2 transition"
            >
              Launch Portal
              <ArrowRight className="w-5 h-5" />
            </Link>
            
            <a
              href="#features"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900/40 hover:bg-slate-900 border border-slate-800 text-slate-300 font-bold transition flex items-center justify-center"
            >
              Explore Features
            </a>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <section id="features" className="max-w-7xl mx-auto mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 px-4 w-full">
          
          {/* Card 1 */}
          <div className="glass-panel p-8 rounded-2xl border border-slate-900 hover:border-slate-800/80 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                <CreditCard className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-3 text-slate-100">Parent Smart Wallet</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Add funds securely using Razorpay, set daily/weekly spending caps, and monitor food purchases instantly.
              </p>
            </div>
            <div className="mt-8 text-xs text-emerald-400 font-semibold tracking-wider uppercase">WALLET CONTROLS</div>
          </div>

          {/* Card 2 */}
          <div className="glass-panel p-8 rounded-2xl border border-slate-900 hover:border-slate-800/80 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <HeartPulse className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-3 text-slate-100">Nutrition Dashboard</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Automatically aggregate calorie intake, proteins, fats, and carbs. Block soft drinks, junk foods, or items matching custom allergies.
              </p>
            </div>
            <div className="mt-8 text-xs text-indigo-400 font-semibold tracking-wider uppercase">DIET & HEALTH</div>
          </div>

          {/* Card 3 */}
          <div className="glass-panel p-8 rounded-2xl border border-slate-900 hover:border-slate-800/80 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold font-heading mb-3 text-slate-100">Staff NFC Scanner</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Process cashless payments at checkout using USB NFC readers. The backend automatically blocks items violating limits or allergies.
              </p>
            </div>
            <div className="mt-8 text-xs text-purple-400 font-semibold tracking-wider uppercase">CANTEEN PROCESSORS</div>
          </div>

        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 px-6 py-8 text-center text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 CampusOne Inc. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Support</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
