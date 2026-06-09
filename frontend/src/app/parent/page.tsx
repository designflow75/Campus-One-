"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { 
  CreditCard, ShieldAlert, HeartPulse, LogOut, RefreshCw, 
  Settings, CheckCircle, TrendingUp, Calendar, Clock, DollarSign
} from 'lucide-react';

export default function ParentDashboard() {
  const router = useRouter();
  const [parentName, setParentName] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  // Add Student states removed (NFC registration handled by Staff portal, child creation handled at subscription)
  
  // Form states
  const [topupAmount, setTopupAmount] = useState('500');
  const [dailyLimit, setDailyLimit] = useState('');
  const [weeklyLimit, setWeeklyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');
  const [perTxLimit, setPerTxLimit] = useState('');
  
  // Toggles
  const [junkFoodBlock, setJunkFoodBlock] = useState(false);
  const [softDrinkBlock, setSoftDrinkBlock] = useState(false);
  const [peanutAllergy, setPeanutAllergy] = useState(false);
  const [dairyAllergy, setDairyAllergy] = useState(false);
  const [eggAllergy, setEggAllergy] = useState(false);

  const [loading, setLoading] = useState(true);
  const [updatingLimits, setUpdatingLimits] = useState(false);
  const [updatingRestrictions, setUpdatingRestrictions] = useState(false);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [processingTopup, setProcessingTopup] = useState(false);
  const [message, setMessage] = useState('');

  // 1. Auth check and initial fetch
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    setParentName(user.name);

    // If not subscribed, redirect to subscription page
    if (localStorage.getItem('subscribed') !== 'true') {
      router.push('/subscription');
      return;
    }

    fetchStudents();
    registerMockFcmToken();
  }, []);

  const registerMockFcmToken = async () => {
    try {
      const mockToken = 'mock-fcm-device-token-123-abc-xyz';
      await apiRequest('/auth/fcm-token', {
        method: 'PATCH',
        body: JSON.stringify({ fcmToken: mockToken }),
      });
      console.log('FCM registration token synchronized successfully.');
    } catch (err) {
      console.error('Error synchronizing FCM registration token:', err);
    }
  };

  const fetchStudents = async (selectId?: string) => {
    try {
      setLoading(true);
      const data = await apiRequest('/students/parent');
      setStudents(data);
      if (data.length > 0) {
        // Select specified or first student
        const targetStudent = selectId ? data.find((s: any) => s.id === selectId) || data[0] : data[0];
        setSelectedStudent(targetStudent);
        await fetchStudentData(targetStudent.id);
      } else {
        setSelectedStudent(null);
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setLoading(false);
    }
  };

  // Student registration forms removed from parent portal dashboard.

  const fetchStudentData = async (studentId: string) => {
    try {
      const studentDetails = await apiRequest(`/students/${studentId}`);
      setSelectedStudent(studentDetails);

      // Load form states
      setDailyLimit(studentDetails.wallet?.dailyLimit?.toString() || '');
      setWeeklyLimit(studentDetails.wallet?.weeklyLimit?.toString() || '');
      setMonthlyLimit(studentDetails.wallet?.monthlyLimit?.toString() || '');
      setPerTxLimit(studentDetails.wallet?.perTransactionLimit?.toString() || '');

      // Load restrictions
      const activeRestrictions = studentDetails.restrictions.map((r: any) => r.type);
      setJunkFoodBlock(activeRestrictions.includes('JUNK_FOOD_BLOCK'));
      setSoftDrinkBlock(activeRestrictions.includes('SOFT_DRINK_BLOCK'));

      // Load allergies
      const activeAllergies = studentDetails.allergies.map((a: any) => a.allergyName);
      setPeanutAllergy(activeAllergies.includes('PEANUT'));
      setDairyAllergy(activeAllergies.includes('DAIRY'));
      setEggAllergy(activeAllergies.includes('EGG'));

      // Fetch analytics
      const analyticsData = await apiRequest(`/analytics/parent/${studentId}`);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading student details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = async (studentId: string) => {
    setLoading(true);
    const selected = students.find((s) => s.id === studentId);
    setSelectedStudent(selected);
    await fetchStudentData(studentId);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  // 2. Add money (Razorpay simulation)
  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !topupAmount) return;

    setProcessingTopup(true);
    // Simulate Razorpay gateway checkout
    setTimeout(async () => {
      try {
        await apiRequest(`/students/${selectedStudent.id}/wallet/topup`, {
          method: 'POST',
          body: JSON.stringify({ amount: Number(topupAmount) }),
        });
        showSuccessMessage(`Successfully loaded ₹${topupAmount} into ${selectedStudent.name}'s wallet.`);
        setShowTopupModal(false);
        // Refresh details
        await fetchStudentData(selectedStudent.id);
      } catch (err: any) {
        alert(err.message || 'Payment failed');
      } finally {
        setProcessingTopup(false);
      }
    }, 2000);
  };

  // 3. Save spending limits
  const handleSaveLimits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;

    setUpdatingLimits(true);
    try {
      await apiRequest(`/students/${selectedStudent.id}/wallet/limits`, {
        method: 'PATCH',
        body: JSON.stringify({
          dailyLimit: dailyLimit === '' ? null : Number(dailyLimit),
          weeklyLimit: weeklyLimit === '' ? null : Number(weeklyLimit),
          monthlyLimit: monthlyLimit === '' ? null : Number(monthlyLimit),
          perTransactionLimit: perTxLimit === '' ? null : Number(perTxLimit),
        }),
      });
      showSuccessMessage('Spending limits updated successfully.');
      await fetchStudentData(selectedStudent.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update limits');
    } finally {
      setUpdatingLimits(false);
    }
  };

  // 4. Save restrictions and allergies
  const handleSaveDietary = async () => {
    if (!selectedStudent) return;
    setUpdatingRestrictions(true);

    try {
      // Aggregate restrictions
      const restrictionsList: string[] = [];
      if (junkFoodBlock) restrictionsList.push('JUNK_FOOD_BLOCK');
      if (softDrinkBlock) restrictionsList.push('SOFT_DRINK_BLOCK');

      // Aggregate allergies
      const allergiesList: string[] = [];
      if (peanutAllergy) allergiesList.push('PEANUT');
      if (dairyAllergy) allergiesList.push('DAIRY');
      if (eggAllergy) allergiesList.push('EGG');

      await apiRequest(`/students/${selectedStudent.id}/restrictions`, {
        method: 'POST',
        body: JSON.stringify({ restrictions: restrictionsList }),
      });

      await apiRequest(`/students/${selectedStudent.id}/allergies`, {
        method: 'POST',
        body: JSON.stringify({ allergies: allergiesList }),
      });

      showSuccessMessage('Dietary restrictions and allergy tags synced successfully.');
      await fetchStudentData(selectedStudent.id);
    } catch (err: any) {
      alert(err.message || 'Failed to save dietary properties');
    } finally {
      setUpdatingRestrictions(false);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <span>Loading parent portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12">
      {/* Navbar */}
      <nav className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-9 h-9 text-emerald-400 flex-shrink-0">
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
            <span className="text-lg font-bold font-heading bg-gradient-to-r from-emerald-400 to-indigo-400 bg-clip-text text-transparent">
              CampusOne Parent
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase">PARENT PORTAL</p>
              <p className="text-sm font-semibold text-slate-300">{parentName}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 mt-8">
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2.5 animate-bounce">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Top selector */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-4 rounded-2xl border border-slate-900 mb-8">
          <div>
            <h2 className="text-xl font-bold font-heading text-slate-100">Canteen & Diet Controls</h2>
            <p className="text-sm text-slate-400">Select child to configure wallets, limits, and menu items blocks.</p>
          </div>
          
          <div className="flex items-center gap-3">
            {students.length > 0 && (
              <>
                <label className="text-sm text-slate-400 font-semibold whitespace-nowrap">Active Student:</label>
                <select
                  value={selectedStudent?.id || ''}
                  onChange={(e) => handleStudentChange(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.class})
                    </option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={() => router.push('/subscription')}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-emerald-400 text-sm font-bold flex items-center gap-2 transition cursor-pointer"
            >
              <span>+ Subscribe / Add Child</span>
            </button>
          </div>
        </div>

        {/* Dashboard grid */}
        {selectedStudent && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMN 1: WALLET & LIMITS */}
            <div className="space-y-8">
              
              {/* Wallet Widget */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs text-slate-500 font-bold tracking-wider uppercase">WALLET BALANCE</span>
                    <h3 className="text-3xl font-extrabold font-heading text-slate-100 mt-1">
                      ₹{analytics?.walletBalance?.toFixed(2) || '0.00'}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                    <CreditCard className="w-6 h-6" />
                  </div>
                </div>

                {/* Spending Summary */}
                <div className="grid grid-cols-3 gap-2 mt-6 border-t border-slate-900/60 pt-5 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">TODAY</span>
                    <span className="text-sm font-bold text-slate-200 block mt-0.5">₹{analytics?.todaySpending || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">WEEK</span>
                    <span className="text-sm font-bold text-slate-200 block mt-0.5">₹{analytics?.weeklySpending || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">MONTH</span>
                    <span className="text-sm font-bold text-slate-200 block mt-0.5">₹{analytics?.monthlySpending || 0}</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowTopupModal(true)}
                  className="w-full mt-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white text-sm font-bold shadow-md hover:opacity-95 transition cursor-pointer"
                >
                  Razorpay Top-Up
                </button>
              </div>

              {/* Spending Limits Form */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <div className="flex items-center gap-2.5 mb-5 border-b border-slate-900 pb-3">
                  <Settings className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-bold font-heading text-base text-slate-200">Spending Controls</h3>
                </div>

                <form onSubmit={handleSaveLimits} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Daily Limit (₹)</label>
                      <input
                        type="number"
                        value={dailyLimit}
                        onChange={(e) => setDailyLimit(e.target.value)}
                        placeholder="No limit"
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Weekly Limit (₹)</label>
                      <input
                        type="number"
                        value={weeklyLimit}
                        onChange={(e) => setWeeklyLimit(e.target.value)}
                        placeholder="No limit"
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Monthly Limit (₹)</label>
                      <input
                        type="number"
                        value={monthlyLimit}
                        onChange={(e) => setMonthlyLimit(e.target.value)}
                        placeholder="No limit"
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs text-slate-400 font-semibold">Per Tx Limit (₹)</label>
                      <input
                        type="number"
                        value={perTxLimit}
                        onChange={(e) => setPerTxLimit(e.target.value)}
                        placeholder="No limit"
                        className="w-full bg-slate-900/60 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={updatingLimits}
                    className="w-full mt-2 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                  >
                    {updatingLimits ? 'Saving...' : 'Save spending limits'}
                  </button>
                </form>
              </div>

            </div>

            {/* COLUMN 2: DIETARY & ALLERGIES */}
            <div className="space-y-8">
              
              {/* Dietary Blocks */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <div className="flex items-center gap-2.5 mb-5 border-b border-slate-900 pb-3">
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold font-heading text-base text-slate-200">Dietary Restrictions</h3>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 transition">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Junk Food Block</h4>
                      <p className="text-xs text-slate-400">Block burgers, fries, chips, and processed snacks.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={junkFoodBlock}
                      onChange={(e) => setJunkFoodBlock(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded border-slate-800 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-slate-900 transition cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/30 border border-slate-900 hover:border-slate-800 transition">
                    <div>
                      <h4 className="text-sm font-bold text-slate-200">Soft Drink Block</h4>
                      <p className="text-xs text-slate-400">Block sodas, energy drinks, and highly sugared beverages.</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={softDrinkBlock}
                      onChange={(e) => setSoftDrinkBlock(e.target.checked)}
                      className="w-4 h-4 text-emerald-500 rounded border-slate-800 bg-slate-900 focus:ring-emerald-500 focus:ring-offset-slate-900 transition cursor-pointer"
                    />
                  </div>
                </div>

                {/* Allergies Management */}
                <div className="mt-8">
                  <h4 className="text-xs font-bold tracking-wider text-slate-500 uppercase mb-4">ACTIVE ALLERGIES</h4>
                  <div className="grid grid-cols-1 gap-2.5">
                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-slate-900 cursor-pointer hover:border-slate-800 transition">
                      <input
                        type="checkbox"
                        checked={peanutAllergy}
                        onChange={(e) => setPeanutAllergy(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 rounded border-slate-800 bg-slate-900 focus:ring-emerald-500 transition"
                      />
                      <span className="text-sm font-semibold text-slate-300">Peanut Allergy</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-slate-900 cursor-pointer hover:border-slate-800 transition">
                      <input
                        type="checkbox"
                        checked={dairyAllergy}
                        onChange={(e) => setDairyAllergy(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 rounded border-slate-800 bg-slate-900 focus:ring-emerald-500 transition"
                      />
                      <span className="text-sm font-semibold text-slate-300">Dairy Allergy</span>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/30 border border-slate-900 cursor-pointer hover:border-slate-800 transition">
                      <input
                        type="checkbox"
                        checked={eggAllergy}
                        onChange={(e) => setEggAllergy(e.target.checked)}
                        className="w-4 h-4 text-emerald-500 rounded border-slate-800 bg-slate-900 focus:ring-emerald-500 transition"
                      />
                      <span className="text-sm font-semibold text-slate-300">Egg Allergy</span>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handleSaveDietary}
                  disabled={updatingRestrictions}
                  className="w-full mt-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 text-sm font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  {updatingRestrictions ? 'Syncing...' : 'Save dietary & allergy configuration'}
                </button>
              </div>

            </div>

            {/* COLUMN 3: NUTRITION & HISTORY */}
            <div className="space-y-8">
              
              {/* Nutrition Dashboard */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <div className="flex items-center gap-2.5 mb-5 border-b border-slate-900 pb-3">
                  <HeartPulse className="w-5 h-5 text-rose-500" />
                  <h3 className="font-bold font-heading text-base text-slate-200">Today's Nutrition</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Calorie Card */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">ENERGY</span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">{analytics?.nutrition?.calories || 0} kcal</h4>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full" 
                        style={{ width: `${Math.min(((analytics?.nutrition?.calories || 0) / 2000) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Protein Card */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">PROTEIN</span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">{analytics?.nutrition?.protein || 0} g</h4>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${Math.min(((analytics?.nutrition?.protein || 0) / 60) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Carbs Card */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">CARBOHYDRATES</span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">{analytics?.nutrition?.carbs || 0} g</h4>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-amber-500 h-full rounded-full" 
                        style={{ width: `${Math.min(((analytics?.nutrition?.carbs || 0) / 250) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Fat Card */}
                  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-900 flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase">LIPIDS (FAT)</span>
                      <h4 className="text-lg font-bold text-slate-200 mt-1">{analytics?.nutrition?.fat || 0} g</h4>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full" 
                        style={{ width: `${Math.min(((analytics?.nutrition?.fat || 0) / 70) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Purchases */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <h3 className="font-bold font-heading text-base text-slate-200 mb-4 border-b border-slate-900 pb-3">Recent Purchases</h3>
                <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                  {analytics?.recentPurchases && analytics.recentPurchases.length > 0 ? (
                    analytics.recentPurchases.map((tx: any) => (
                      <div key={tx.id} className="p-3 rounded-xl bg-slate-900/30 border border-slate-950/40 flex justify-between items-center hover:border-slate-800 transition">
                        <div>
                          <div className="text-sm font-bold text-slate-300">
                            {tx.items.map((i: any) => `${i.name} (x${i.quantity})`).join(', ')}
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            {new Date(tx.timestamp).toLocaleString()}
                          </div>
                        </div>
                        <span className="text-sm font-bold text-emerald-400">₹{tx.amount.toFixed(2)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-6">No purchases logged today.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {!selectedStudent && (
          <div className="glass-panel p-8 rounded-2xl border border-slate-900 max-w-2xl mx-auto mt-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
            
            <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-emerald-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            
            <h3 className="text-xl font-bold font-heading text-slate-100 mb-2">No Student Profile Active</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-8 leading-relaxed">
              You do not have any child profiles registered. Please set up your student profile and subscription on the subscription page.
            </p>

            <button
              onClick={() => router.push('/subscription')}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 text-white text-sm font-bold shadow-md hover:opacity-95 transition cursor-pointer mx-auto block"
            >
              Go to Subscription
            </button>
          </div>
        )}
      </div>

      {/* RAZORPAY MOCK TOP-UP MODAL */}
      {showTopupModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm glass-panel border border-slate-850 p-6 rounded-2xl text-slate-100 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-600" />
            <h3 className="text-lg font-bold font-heading text-slate-100 mb-2 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Razorpay Secure Checkout
            </h3>
            <p className="text-xs text-slate-400 mb-6">Payment provider test-mode simulation.</p>

            <form onSubmit={handleTopup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold uppercase">TOP-UP AMOUNT (INR)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-slate-500 text-sm font-semibold">₹</span>
                  <input
                    type="number"
                    required
                    min="50"
                    value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:outline-none text-slate-100 font-bold placeholder-slate-700"
                  />
                </div>
                <div className="flex gap-1.5 mt-2">
                  {['100', '200', '500', '1000'].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setTopupAmount(amt)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:border-emerald-500/40 cursor-pointer"
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-900/60 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTopupModal(false)}
                  className="w-1/2 py-2.5 rounded-xl border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingTopup}
                  className="w-1/2 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:opacity-95 shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {processingTopup ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Paying...
                    </>
                  ) : (
                    'Pay Now'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Add Student Modal removed */}

    </div>
  );
}
