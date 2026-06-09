"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { 
  Check, CreditCard, Smartphone, Landmark, ArrowLeft, 
  RefreshCw, LogOut, ArrowRight, ShieldCheck, ChevronRight, ChevronDown
} from 'lucide-react';

export default function SubscriptionPage() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [view, setView] = useState<'PLAN' | 'CHECKOUT'>('PLAN');
  const [selectedPlan, setSelectedPlan] = useState<{ name: string; price: number; period: string } | null>(null);
  
  // Checkout states
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'UPI' | 'NETBANKING'>('CARD');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [upiId, setUpiId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [checkoutError, setCheckoutError] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    setUserName(user.name);
  }, [router]);

  const handleSelectPlan = (name: string, price: number, period: string) => {
    setSelectedPlan({ name, price, period });
    setView('CHECKOUT');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!newStudentName.trim() || !newStudentClass.trim()) {
      setCheckoutError("Child's Full Name and Class/Grade are required.");
      return;
    }

    setLoading(true);

    try {
      // Create student profile
      await apiRequest('/students', {
        method: 'POST',
        body: JSON.stringify({
          name: newStudentName.trim(),
          class: newStudentClass.trim(),
        }),
      });

      // Simulate payment gateway authorization
      setTimeout(() => {
        setLoading(false);
        setSuccess(true);
        
        // Store subscription status in local storage
        localStorage.setItem('subscribed', 'true');

        // Redirect to parent dashboard after 1.5 seconds
        setTimeout(() => {
          router.push('/parent');
        }, 1500);
      }, 2000);

    } catch (err: any) {
      setLoading(false);
      setCheckoutError(err.message || 'Failed to create student profile or process payment.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // Custom NFC Logo SVG
  const LogoSvg = () => (
    <svg viewBox="0 0 100 100" className="w-8 h-8 text-emerald-400">
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

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm glass-panel p-8 rounded-2xl border border-slate-800 text-center animate-float">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <ShieldCheck className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-bold font-heading text-emerald-400">Payment Successful!</h3>
          <p className="text-sm text-slate-400 mt-2">Initializing your smart canteen dashboard...</p>
          <RefreshCw className="w-6 h-6 animate-spin text-emerald-500 mx-auto mt-6" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl -z-10" />

      {/* Standard Header (Navbar) */}
      <header className="border-b border-slate-900 px-6 py-4 backdrop-blur-md sticky top-0 z-50 bg-slate-950/80">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <LogoSvg />
            <span className="text-xl font-bold font-heading bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              CampusOne Subscription
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Parent Account</p>
              <p className="text-xs font-semibold text-slate-300">{userName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition text-xs cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center py-12 px-6">
        <div className="w-full">
          
          {view === 'PLAN' ? (
            /* CHOOSE YOUR PLAN VIEW (Full Width Responsive) */
            <div className="space-y-10 max-w-4xl mx-auto">
              <div className="text-center space-y-3">
                <h1 className="text-3xl md:text-4xl font-extrabold font-heading text-slate-100">Choose Your Plan</h1>
                <p className="text-sm md:text-base text-slate-400 max-w-xl mx-auto leading-relaxed">
                  Your 3-day trial has ended. Subscribe to continue managing student meals, tracking macro nutrition, and applying spending limits.
                </p>
              </div>

              {/* Plans side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
                {/* Annual Plan Card */}
                <div className="glass-panel p-8 rounded-2xl border border-slate-850 hover:border-slate-750 transition relative overflow-hidden flex flex-col justify-between group">
                  <span className="absolute top-4 right-4 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
                    Save ₹140
                  </span>
                  
                  <div>
                    <h3 className="text-lg font-bold font-heading text-slate-100">Annual Saver</h3>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-extrabold font-heading text-slate-200">₹700</span>
                      <span className="text-sm text-slate-500 ml-1">/year</span>
                    </div>

                    <ul className="mt-6 space-y-4">
                      <li className="flex items-center gap-2.5 text-sm text-slate-400 font-semibold">
                        <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Unlimited NFC Scans
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-slate-400 font-semibold">
                        <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Advanced Spending Controls
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-slate-400 font-semibold">
                        <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Individual Student Account
                      </li>
                      <li className="flex items-center gap-2.5 text-sm text-slate-400 font-semibold">
                        <div className="p-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Priority Support 24/7
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan('Annual Saver', 700, 'year')}
                    className="w-full mt-8 py-3 rounded-xl border border-slate-800 text-slate-300 font-bold hover:border-slate-700 transition cursor-pointer text-sm"
                  >
                    Select Plan
                  </button>
                </div>

                {/* Monthly Plan Card */}
                <div className="p-8 rounded-2xl bg-blue-600 text-white relative overflow-hidden shadow-lg shadow-blue-500/10 flex flex-col justify-between group">
                  <span className="absolute top-4 right-4 text-[10px] font-bold px-2.5 py-0.5 rounded bg-white/20 text-white border border-white/10 uppercase tracking-wide">
                    Most Popular
                  </span>

                  <div>
                    <h3 className="text-lg font-bold font-heading">Monthly Pro</h3>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-extrabold font-heading">₹70</span>
                      <span className="text-sm text-blue-200 ml-1">/month</span>
                    </div>

                    <ul className="mt-6 space-y-4 text-white/90">
                      <li className="flex items-center gap-2.5 text-sm font-semibold">
                        <div className="p-0.5 rounded-full bg-white/20 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Unlimited NFC Scans
                      </li>
                      <li className="flex items-center gap-2.5 text-sm font-semibold">
                        <div className="p-0.5 rounded-full bg-white/20 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Advanced Spending Controls
                      </li>
                      <li className="flex items-center gap-2.5 text-sm font-semibold">
                        <div className="p-0.5 rounded-full bg-white/20 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Individual Student Account
                      </li>
                      <li className="flex items-center gap-2.5 text-sm font-semibold">
                        <div className="p-0.5 rounded-full bg-white/20 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        Priority Support 24/7
                      </li>
                    </ul>
                  </div>

                  <button
                    onClick={() => handleSelectPlan('Monthly Pro', 70, 'month')}
                    className="w-full mt-8 py-3 rounded-xl bg-white text-blue-600 font-bold hover:bg-slate-100 transition cursor-pointer text-sm shadow-md"
                  >
                    Subscribe Now
                  </button>
                </div>
              </div>

              {/* Restores */}
              <div className="text-center pt-4">
                <button className="text-xs text-slate-500 hover:text-slate-400 font-semibold cursor-pointer underline">
                  Restore Purchase
                </button>
                <p className="text-[11px] text-slate-600 mt-2">
                  Cancel anytime. Terms and conditions apply.
                </p>
              </div>
            </div>
          ) : (
            /* CHECKOUT VIEW (Split Screen 2-Column Layout) */
            <div className="space-y-6 max-w-4xl mx-auto">
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setView('PLAN')}
                  className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-2xl font-bold font-heading text-slate-100">Checkout</h1>
              </div>

              {/* 2-Column Split grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Column Left: Plan Details Summary (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="glass-panel p-6 rounded-2xl border border-slate-900 relative overflow-hidden flex flex-col justify-between h-full min-h-[200px]">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl" />
                    
                    <div className="space-y-5">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">SELECTED PLAN</span>
                        <h3 className="text-lg font-bold text-slate-200 mt-1">{selectedPlan?.name}</h3>
                      </div>

                      <ul className="space-y-2.5">
                        <li className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Unlimited NFC Scans
                        </li>
                        <li className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Priority Support 24/7
                        </li>
                        <li className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Detailed Analytics Dashboard
                        </li>
                      </ul>
                    </div>

                    <div className="border-t border-slate-900/60 pt-4 mt-6 flex justify-between items-baseline">
                      <span className="text-xs text-slate-500 font-bold uppercase">Price</span>
                      <div className="text-right">
                        <span className="text-2xl font-extrabold text-slate-100">₹{selectedPlan?.price}</span>
                        <span className="text-xs text-slate-500">/{selectedPlan?.period}</span>
                      </div>
                    </div>
                  </div>

                  {/* Child Profile Setup Card */}
                  <div className="glass-panel p-6 rounded-2xl border border-slate-900 space-y-4">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">CHILD PROFILE SETUP</span>
                      <h3 className="text-base font-bold text-slate-200 mt-1">Register Child Details</h3>
                    </div>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Child's Full Name</label>
                        <input
                          type="text"
                          required
                          value={newStudentName}
                          onChange={(e) => setNewStudentName(e.target.value)}
                          placeholder="e.g. Alex Mercer"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition placeholder-slate-700"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Class / Grade / Section</label>
                        <input
                          type="text"
                          required
                          value={newStudentClass}
                          onChange={(e) => setNewStudentClass(e.target.value)}
                          placeholder="e.g. Grade 5-A"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition placeholder-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column Right: Payment Options Accordions (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Select Payment Method</h4>
                  <div className="space-y-3">
                    
                    {/* Credit / Debit Card Accordion */}
                    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('CARD')}
                        className={`w-full flex items-center justify-between p-4 hover:bg-slate-900/50 transition cursor-pointer ${
                          paymentMethod === 'CARD' ? 'bg-slate-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className={`w-4 h-4 ${paymentMethod === 'CARD' ? 'text-blue-500' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold text-slate-200">Credit / Debit Card</span>
                        </div>
                        {paymentMethod === 'CARD' ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      {paymentMethod === 'CARD' && (
                        <div className="p-4 border-t border-slate-900/50 bg-slate-950/20 space-y-3 animate-float-subtle">
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">Card Number</label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={cardNumber}
                                onChange={(e) => setCardNumber(e.target.value)}
                                placeholder="Card Number"
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                              />
                              <div className="absolute right-3.5 top-2.5 flex items-center">
                                <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M5 8a4 4 0 0 1 0 8M8 6a6 6 0 0 1 0 12M11 4a8 8 0 0 1 0 16" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                              <input
                                type="text"
                                required
                                value={expiry}
                                onChange={(e) => setExpiry(e.target.value)}
                                placeholder="MM/YY"
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 uppercase">CVV</label>
                              <input
                                type="password"
                                required
                                maxLength={3}
                                value={cvv}
                                onChange={(e) => setCvv(e.target.value)}
                                placeholder="•••"
                                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* UPI Accordion */}
                    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('UPI')}
                        className={`w-full flex items-center justify-between p-4 hover:bg-slate-900/50 transition cursor-pointer ${
                          paymentMethod === 'UPI' ? 'bg-slate-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Smartphone className={`w-4 h-4 ${paymentMethod === 'UPI' ? 'text-blue-500' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold text-slate-200">UPI</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 uppercase tracking-wider border border-emerald-500/10">FASTPAY</span>
                          {paymentMethod === 'UPI' ? (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {paymentMethod === 'UPI' && (
                        <div className="p-4 border-t border-slate-900/50 bg-slate-950/20 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {['Google Pay', 'PhonePe', 'Paytm'].map((app) => (
                              <button
                                key={app}
                                type="button"
                                onClick={() => setUpiId(`${userName.toLowerCase().replace(' ', '')}@okaxis`)}
                                className="py-2 rounded-lg bg-slate-950 border border-slate-900 text-[10px] font-bold text-slate-400 hover:text-slate-200 hover:border-blue-500/30 transition cursor-pointer"
                              >
                                {app}
                              </button>
                            ))}
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">UPI ID / VPA</label>
                            <input
                              type="text"
                              required
                              value={upiId}
                              onChange={(e) => setUpiId(e.target.value)}
                              placeholder="username@bank"
                              className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Netbanking Accordion */}
                    <div className="border border-slate-900 bg-slate-900/30 rounded-2xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('NETBANKING')}
                        className={`w-full flex items-center justify-between p-4 hover:bg-slate-900/50 transition cursor-pointer ${
                          paymentMethod === 'NETBANKING' ? 'bg-slate-900/20' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Landmark className={`w-4 h-4 ${paymentMethod === 'NETBANKING' ? 'text-blue-500' : 'text-slate-400'}`} />
                          <span className="text-xs font-semibold text-slate-200">Netbanking</span>
                        </div>
                        {paymentMethod === 'NETBANKING' ? (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        )}
                      </button>

                      {paymentMethod === 'NETBANKING' && (
                        <div className="p-4 border-t border-slate-900/50 bg-slate-950/20">
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Select Bank</label>
                          <select className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 transition cursor-pointer">
                            <option>State Bank of India (SBI)</option>
                            <option>HDFC Bank</option>
                            <option>ICICI Bank</option>
                            <option>Axis Bank</option>
                          </select>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>

              {checkoutError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs text-center font-semibold max-w-4xl mx-auto mb-4">
                  {checkoutError}
                </div>
              )}

              {/* Submit Pay button Row */}
              <form onSubmit={handlePaymentSubmit} className="pt-6 border-t border-slate-900/60 flex justify-between items-center max-w-4xl mx-auto">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">AMOUNT PAYABLE</span>
                  <span className="text-xl font-extrabold text-slate-200 block">₹{selectedPlan?.price?.toFixed(2)}</span>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-500/10 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 text-sm"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Validating Payment...
                    </>
                  ) : (
                    <>
                      Pay ₹{selectedPlan?.price}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

            </div>
          )}

        </div>
      </main>

      {/* Standard Footer */}
      <footer className="border-t border-slate-900/40 px-6 py-6 text-center text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 CampusOne Pay. All transactions are SSL encrypted.</p>
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
