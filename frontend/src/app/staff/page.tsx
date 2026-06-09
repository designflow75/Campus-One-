"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { 
  ShoppingBag, Trash2, ShieldAlert, CreditCard, LogOut, 
  RefreshCw, CheckCircle, XCircle, Info, History, DollarSign
} from 'lucide-react';

export default function StaffDashboard() {
  const router = useRouter();
  const [staffName, setStaffName] = useState('');
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [cart, setCart] = useState<{ [itemId: string]: { item: any; quantity: number } }>({});
  const [stats, setStats] = useState<any>(null);
  
  // Scanning / Verification Simulation states
  const [nfcUid, setNfcUid] = useState('123456789'); // Preset with Alex's UID for convenience
  const [processingTransaction, setProcessingTransaction] = useState(false);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [transactionResult, setTransactionResult] = useState<any>(null);
  const [isScanning, setIsScanning] = useState(false);

  const [loading, setLoading] = useState(true);

  // Tab & Card assignment states
  const [activeTab, setActiveTab] = useState<'CHECKOUT' | 'NFC_REGISTRY'>('CHECKOUT');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentForNfc, setSelectedStudentForNfc] = useState('');
  const [newNfcUid, setNewNfcUid] = useState('');
  const [assigningNfc, setAssigningNfc] = useState(false);
  const [nfcAssignError, setNfcAssignError] = useState('');
  const [nfcAssignSuccess, setNfcAssignSuccess] = useState('');

  // Physical Web NFC states
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanningActive, setNfcScanningActive] = useState(false);
  const [nfcPermissionState, setNfcPermissionState] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [nfcErrorText, setNfcErrorText] = useState('');

  // Web NFC NDEFReader API integration
  useEffect(() => {
    if (typeof window !== 'undefined' && 'NDEFReader' in window) {
      setNfcSupported(true);
      startPhysicalNfcScan();
    }
  }, [activeTab]);

  const startPhysicalNfcScan = async () => {
    if (typeof window === 'undefined' || !('NDEFReader' in window)) {
      setNfcPermissionState('unsupported');
      return;
    }

    try {
      const NDEFReaderClass = (window as any).NDEFReader;
      const ndef = new NDEFReaderClass();
      await ndef.scan();
      setNfcScanningActive(true);
      setNfcPermissionState('granted');
      setNfcErrorText('');

      ndef.addEventListener("readingerror", () => {
        setNfcErrorText("NFC read error. Try tapping the card again.");
      });

      ndef.addEventListener("reading", ({ serialNumber }: any) => {
        const cleanUid = serialNumber.replace(/:/g, '').toUpperCase();
        console.log("Web NFC scanned hardware UID:", cleanUid);

        if (activeTab === 'CHECKOUT') {
          setNfcUid(cleanUid);
          setCart((currentCart) => {
            const cartLines = Object.values(currentCart);
            if (cartLines.length > 0) {
              autoCheckout(cleanUid, currentCart);
            }
            return currentCart;
          });
        } else if (activeTab === 'NFC_REGISTRY') {
          setNewNfcUid(cleanUid);
          setSelectedStudentForNfc((currentStudentId) => {
            if (currentStudentId) {
              autoLinkNfc(currentStudentId, cleanUid);
            }
            return currentStudentId;
          });
        }
      });
    } catch (err: any) {
      console.error("Web NFC Error:", err);
      if (err.name === 'NotAllowedError') {
        setNfcPermissionState('denied');
      } else {
        setNfcErrorText(err.message || "Could not activate NFC reader.");
      }
      setNfcScanningActive(false);
    }
  };

  const autoCheckout = async (cardUid: string, currentCart: any) => {
    const cartLines = Object.values(currentCart);
    if (cartLines.length === 0) return;

    setProcessingTransaction(true);
    try {
      const payload = {
        nfcUid: cardUid,
        items: cartLines.map((line: any) => ({
          itemId: line.item.id,
          quantity: line.quantity,
        })),
      };

      const result = await apiRequest('/transactions/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTransactionResult(result);
      setShowResultOverlay(true);

      if (result.success) {
        clearCart();
      }

      // Refresh daily metrics
      const statsData = await apiRequest('/analytics/staff');
      setStats(statsData);
    } catch (err: any) {
      setTransactionResult({
        success: false,
        message: 'Transaction failed',
        reason: err.message || 'Unknown network error',
      });
      setShowResultOverlay(true);
    } finally {
      setProcessingTransaction(false);
    }
  };

  const autoLinkNfc = async (studentId: string, cardUid: string) => {
    setNfcAssignError('');
    setNfcAssignSuccess('');
    setAssigningNfc(true);
    try {
      await apiRequest(`/students/${studentId}/nfc`, {
        method: 'PATCH',
        body: JSON.stringify({ nfcUid: cardUid }),
      });

      setNfcAssignSuccess(`Card UID ${cardUid} linked successfully!`);
      setNewNfcUid('');
      setSelectedStudentForNfc('');
      
      // Refresh students list
      const studentsData = await apiRequest('/students');
      setStudents(studentsData);
    } catch (err: any) {
      setNfcAssignError(err.message || 'Failed to assign NFC Card.');
    } finally {
      setAssigningNfc(false);
    }
  };

  // 1. Auth check and initial load
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'STAFF' && user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    setStaffName(user.name);

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const menu = await apiRequest('/menu');
      setMenuItems(menu.filter((item: any) => item.isAvailable));

      const statsData = await apiRequest('/analytics/staff');
      setStats(statsData);

      const studentsData = await apiRequest('/students');
      setStudents(studentsData);
    } catch (err) {
      console.error('Error fetching staff data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignNfc = async (e: React.FormEvent) => {
    e.preventDefault();
    setNfcAssignError('');
    setNfcAssignSuccess('');
    if (!selectedStudentForNfc || !newNfcUid.trim()) {
      setNfcAssignError('Please select a student and enter/scan a Card UID.');
      return;
    }

    setAssigningNfc(true);
    try {
      await apiRequest(`/students/${selectedStudentForNfc}/nfc`, {
        method: 'PATCH',
        body: JSON.stringify({ nfcUid: newNfcUid.trim() }),
      });

      setNfcAssignSuccess('NFC Card linked successfully!');
      setNewNfcUid('');
      setSelectedStudentForNfc('');
      
      // Refresh students list
      const studentsData = await apiRequest('/students');
      setStudents(studentsData);
    } catch (err: any) {
      setNfcAssignError(err.message || 'Failed to assign NFC Card.');
    } finally {
      setAssigningNfc(false);
    }
  };

  // 2. Cart handlers
  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev[item.id];
      return {
        ...prev,
        [item.id]: {
          item,
          quantity: existing ? existing.quantity + 1 : 1,
        },
      };
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const updateQuantity = (itemId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: qty,
      },
    }));
  };

  const clearCart = () => {
    setCart({});
  };

  const getCartTotal = () => {
    return Object.values(cart).reduce((sum, line) => sum + line.item.price * line.quantity, 0);
  };

  // 3. Process Card Scan
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cartLines = Object.values(cart);
    if (cartLines.length === 0 || !nfcUid) return;

    setProcessingTransaction(true);
    try {
      const payload = {
        nfcUid,
        items: cartLines.map((line) => ({
          itemId: line.item.id,
          quantity: line.quantity,
        })),
      };

      const result = await apiRequest('/transactions/scan', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setTransactionResult(result);
      setShowResultOverlay(true);

      if (result.success) {
        clearCart();
      }

      // Refresh daily metrics
      const statsData = await apiRequest('/analytics/staff');
      setStats(statsData);
    } catch (err: any) {
      setTransactionResult({
        success: false,
        message: 'Transaction failed',
        reason: err.message || 'Unknown network error',
      });
      setShowResultOverlay(true);
    } finally {
      setProcessingTransaction(false);
    }
  };

  const triggerNfcScan = async () => {
    const cartLines = Object.values(cart);
    if (cartLines.length === 0 || !nfcUid || isScanning || processingTransaction) return;

    setIsScanning(true);
    // Simulate a 1.2-second physical reading delay
    setTimeout(async () => {
      setIsScanning(false);
      setProcessingTransaction(true);
      try {
        const payload = {
          nfcUid,
          items: cartLines.map((line) => ({
            itemId: line.item.id,
            quantity: line.quantity,
          })),
        };

        const result = await apiRequest('/transactions/scan', {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        setTransactionResult(result);
        setShowResultOverlay(true);

        if (result.success) {
          clearCart();
        }

        const statsData = await apiRequest('/analytics/staff');
        setStats(statsData);
      } catch (err: any) {
        setTransactionResult({
          success: false,
          message: 'Transaction failed',
          reason: err.message || 'Unknown network error',
        });
        setShowResultOverlay(true);
      } finally {
        setProcessingTransaction(false);
      }
    }, 1200);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading && menuItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          <span>Loading canteen checkout...</span>
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
              CampusOne Staff
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase">CANTEEN OPERATOR</p>
              <p className="text-sm font-semibold text-slate-300">{staffName}</p>
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

      {/* Main Layout */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {/* Physical NFC Reader Status Alert */}
        {nfcSupported ? (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/40 border border-slate-900 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  nfcScanningActive ? 'bg-emerald-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${
                  nfcScanningActive ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
              </span>
              <div>
                <p className="text-xs font-bold text-slate-200">
                  {nfcScanningActive ? 'Physical NFC Reader Active' : 'Physical NFC Reader Stopped'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {nfcScanningActive 
                    ? 'Hardware scanner is listening. Tap any physical card against your phone to trigger actions.' 
                    : 'Hardware scanner is inactive. Tap "Activate Scanner" to start listening.'}
                </p>
              </div>
            </div>
            {!nfcScanningActive && (
              <button
                type="button"
                onClick={startPhysicalNfcScan}
                className="px-4 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/35 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold cursor-pointer transition"
              >
                Activate Scanner
              </button>
            )}
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-2xl bg-slate-900/20 border border-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <div>
                <p className="text-xs font-bold text-slate-400">NFC Simulator Active</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Hardware NFC reading is unavailable on this browser/device. Use the manual controls below to test.</p>
              </div>
            </div>
          </div>
        )}

        {nfcErrorText && (
          <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold">
            {nfcErrorText}
          </div>
        )}

        {/* Statistics Grid */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold uppercase">TODAY'S ORDERS</span>
              <p className="text-xl font-extrabold font-heading text-slate-200 mt-1">{stats.todayTransactions}</p>
            </div>
            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold uppercase">REVENUE</span>
              <p className="text-xl font-extrabold font-heading text-emerald-400 mt-1">₹{stats.revenueSummary.toFixed(2)}</p>
            </div>
            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold uppercase">FAILED SCANS</span>
              <p className="text-xl font-extrabold font-heading text-rose-500 mt-1">{stats.failedTransactions}</p>
            </div>
            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-900">
              <span className="text-[10px] text-slate-500 font-bold uppercase">ACTIVE STUDENTS</span>
              <p className="text-xl font-extrabold font-heading text-indigo-400 mt-1">{stats.activeStudents}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* COLUMN 1 & 2: ITEMS GRID */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('CHECKOUT')}
                  className={`text-lg font-bold font-heading pb-1 transition border-b-2 cursor-pointer ${
                    activeTab === 'CHECKOUT'
                      ? 'text-indigo-400 border-indigo-500'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  Canteen Menu
                </button>
                <button
                  onClick={() => setActiveTab('NFC_REGISTRY')}
                  className={`text-lg font-bold font-heading pb-1 transition border-b-2 cursor-pointer ${
                    activeTab === 'NFC_REGISTRY'
                      ? 'text-indigo-400 border-indigo-500'
                      : 'text-slate-500 border-transparent hover:text-slate-300'
                  }`}
                >
                  NFC Card Assignment
                </button>
              </div>
              {activeTab === 'CHECKOUT' ? (
                <span className="text-xs text-slate-400 font-semibold">{menuItems.length} items available</span>
              ) : (
                <span className="text-xs text-slate-400 font-semibold">{students.length} students registered</span>
              )}
            </div>

            {activeTab === 'CHECKOUT' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 animate-float-subtle">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    className="glass-panel p-4 rounded-2xl border border-slate-900/60 text-left hover:border-indigo-500/40 cursor-pointer flex flex-col justify-between group transition relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-indigo-500/5 rounded-full blur-xl group-hover:bg-indigo-500/10 transition" />
                    
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 tracking-wider uppercase block">{item.category}</span>
                      <h3 className="text-sm font-bold text-slate-200 mt-1.5 group-hover:text-white transition line-clamp-1">{item.name}</h3>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {item.allergenTags && item.allergenTags.split(',').map((tag: string) => (
                          <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300 uppercase">
                            {tag.trim()}
                          </span>
                        ))}
                        {item.restrictionTags && item.restrictionTags.split(',').map((tag: string) => (
                          <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 uppercase">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-5 border-t border-slate-900/60 pt-3">
                      <span className="text-xs text-slate-500 font-semibold">{item.calories} kcal</span>
                      <span className="text-sm font-extrabold text-indigo-400">₹{item.price.toFixed(2)}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'NFC_REGISTRY' && (
              <div className="space-y-6 animate-float-subtle">
                {/* Issue & Assign Form */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-900 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl" />
                  <h3 className="text-base font-bold font-heading text-slate-200 mb-2">Issue & Assign NFC Card</h3>
                  <p className="text-xs text-slate-400 mb-6">Select a student and link their physical NFC card UID.</p>
                  
                  <form onSubmit={handleAssignNfc} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Select Student</label>
                      <select
                        value={selectedStudentForNfc}
                        onChange={(e) => setSelectedStudentForNfc(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                        required
                      >
                        <option value="">-- Select Student --</option>
                        {students.map((s: any) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.class}) {s.nfcUid ? `[Active: ${s.nfcUid}]` : '[No Card Linked]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">NFC Card UID</label>
                      <input
                        type="text"
                        required
                        value={newNfcUid}
                        onChange={(e) => setNewNfcUid(e.target.value)}
                        placeholder="e.g. 999999999"
                        className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3.5 py-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition placeholder-slate-700"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={assigningNfc}
                      className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition disabled:opacity-50 text-xs shadow-md shadow-indigo-600/10 cursor-pointer flex justify-center items-center gap-1.5"
                    >
                      {assigningNfc ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Linking...
                        </>
                      ) : (
                        'Link NFC Card'
                      )}
                    </button>
                  </form>

                  {nfcAssignError && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold">
                      {nfcAssignError}
                    </div>
                  )}

                  {nfcAssignSuccess && (
                    <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold">
                      {nfcAssignSuccess}
                    </div>
                  )}
                </div>

                {/* Directory */}
                <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                  <h3 className="text-base font-bold font-heading text-slate-200 mb-4">Student Cards Directory</h3>
                  
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto pr-1">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 uppercase tracking-wider font-bold">
                          <th className="py-3 px-4">Student Name</th>
                          <th className="py-3 px-4">Class</th>
                          <th className="py-3 px-4">Parent Email</th>
                          <th className="py-3 px-4">Card UID</th>
                          <th className="py-3 px-4">Wallet Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.length > 0 ? (
                          students.map((s: any) => (
                            <tr key={s.id} className="border-b border-slate-900/60 hover:bg-slate-900/10 transition">
                              <td className="py-3.5 px-4 font-bold text-slate-200">{s.name}</td>
                              <td className="py-3.5 px-4 text-slate-400">{s.class}</td>
                              <td className="py-3.5 px-4 text-slate-450">{s.parent?.email || 'N/A'}</td>
                              <td className="py-3.5 px-4">
                                {s.nfcUid ? (
                                  <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold tracking-wider">
                                    {s.nfcUid}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 italic">No Card assigned</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 font-bold text-slate-300">₹{s.wallet?.balance?.toFixed(2) || '0.00'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">No students registered in the system.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* COLUMN 3: CART & NFC SCANNER */}
          <div className="space-y-6">
            
            {/* Cart Box */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-900 flex flex-col justify-between min-h-[400px]">
              <div>
                <div className="flex justify-between items-center mb-5 border-b border-slate-900 pb-3">
                  <h3 className="font-bold font-heading text-base text-slate-200">Current Cart</h3>
                  {Object.keys(cart).length > 0 && (
                    <button
                      onClick={clearCart}
                      className="text-xs text-slate-500 hover:text-rose-400 font-semibold flex items-center gap-1 cursor-pointer transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear
                    </button>
                  )}
                </div>

                {/* Cart Items list */}
                <div className="space-y-3.5 max-h-[260px] overflow-y-auto pr-1">
                  {Object.values(cart).length > 0 ? (
                    Object.values(cart).map((line) => (
                      <div key={line.item.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/30 border border-slate-950/40">
                        <div className="flex-1 min-w-0 pr-3">
                          <h4 className="text-sm font-bold text-slate-300 line-clamp-1">{line.item.name}</h4>
                          <span className="text-[10px] text-slate-500 font-bold">₹{line.item.price.toFixed(2)} each</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(line.item.id, line.quantity - 1)}
                            className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center cursor-pointer transition border border-slate-850"
                          >
                            -
                          </button>
                          <span className="text-sm font-bold w-6 text-center text-slate-200">{line.quantity}</span>
                          <button
                            onClick={() => updateQuantity(line.item.id, line.quantity + 1)}
                            className="w-6 h-6 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold flex items-center justify-center cursor-pointer transition border border-slate-850"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-12">Cart is empty. Click items to checkout.</p>
                  )}
                </div>
              </div>

              {/* NFC Card scan block */}
              {Object.keys(cart).length > 0 && (
                <div className="mt-8 border-t border-slate-900/60 pt-5 text-center">
                  <div className="flex justify-between items-center mb-4 text-left">
                    <span className="text-sm text-slate-400 font-semibold">Total Price:</span>
                    <span className="text-xl font-extrabold text-indigo-400">₹{getCartTotal().toFixed(2)}</span>
                  </div>

                  {/* SELECT TEST CARD */}
                  <div className="space-y-1.5 mb-5 text-left">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      SELECT TEST CARD
                    </label>
                    <select
                      value={nfcUid}
                      onChange={(e) => setNfcUid(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                    >
                      <option value="">-- Choose Card to Test --</option>
                      {students.filter((s: any) => s.nfcUid).map((s: any) => (
                        <option key={s.id} value={s.nfcUid}>
                          {s.name} ({s.class}) - Card: {s.nfcUid}
                        </option>
                      ))}
                      <option value="123456789">Mock Card: 123456789 (Alex Mercer)</option>
                      <option value="999999999">Mock Unregistered: 999999999</option>
                    </select>
                  </div>

                  {/* Large Circular Interactive Scanner Button (CampusOne Logo style) */}
                  <div className="flex flex-col items-center justify-center my-6 py-2">
                    <button
                      type="button"
                      onClick={triggerNfcScan}
                      disabled={processingTransaction || isScanning || !nfcUid}
                      className={`w-36 h-36 rounded-full bg-slate-950 border-2 ${
                        isScanning 
                          ? 'border-emerald-500 shadow-lg shadow-emerald-500/20' 
                          : 'border-slate-800 hover:border-emerald-500/40'
                      } relative flex flex-col items-center justify-center cursor-pointer transition duration-300 shadow-inner group overflow-hidden`}
                    >
                      {isScanning && (
                        <div className="absolute inset-0 rounded-full border border-emerald-500 animate-ping opacity-75" />
                      )}
                      
                      {/* Concentric Green Arcs and Hand Icon SVG (matching the logo) */}
                      <svg 
                        viewBox="0 0 100 100" 
                        className={`w-24 h-24 transition duration-300 ${isScanning ? 'scale-105' : 'group-hover:scale-105'}`}
                      >
                        {/* Concentric Arcs on the left */}
                        <path 
                          d="M 35 15 A 35 35 0 0 0 15 50" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="4" 
                          strokeLinecap="round"
                          className={isScanning ? 'animate-pulse' : ''}
                        />
                        <path 
                          d="M 42 22 A 28 28 0 0 0 22 50" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="4" 
                          strokeLinecap="round"
                          className={isScanning ? 'animate-pulse' : ''}
                        />
                        <path 
                          d="M 49 29 A 21 21 0 0 0 29 50" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="4" 
                          strokeLinecap="round"
                          className={isScanning ? 'animate-pulse' : ''}
                        />
                        
                        {/* Hand holding Credit Card on the right */}
                        <g transform="rotate(-15 60 50)">
                          {/* Card */}
                          <rect 
                            x="46" 
                            y="36" 
                            width="30" 
                            height="20" 
                            rx="2" 
                            fill="none" 
                            stroke="#10b981" 
                            strokeWidth="3.5" 
                          />
                          {/* Chip */}
                          <rect 
                            x="50" 
                            y="42" 
                            width="5" 
                            height="4" 
                            fill="#10b981" 
                          />
                          {/* Card stripe */}
                          <line 
                            x1="46" 
                            y1="49" 
                            x2="76" 
                            y2="49" 
                            stroke="#10b981" 
                            strokeWidth="1.5" 
                          />
                        </g>
                        
                        {/* Hand/Fingers holding card */}
                        <path 
                          d="M 68 54 C 72 58, 76 62, 78 68 C 79 72, 77 75, 73 75 C 69 75, 64 71, 61 69 L 55 64" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="3.5" 
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Hover Ring Label */}
                      <span className="absolute bottom-3 text-[10px] font-extrabold text-slate-500 group-hover:text-emerald-400 uppercase tracking-widest transition">
                        {isScanning ? 'READING...' : 'TAP CARD'}
                      </span>
                    </button>

                    <span className="text-[10px] text-slate-400 font-semibold mt-3">
                      {isScanning ? 'Reading card. Validating with backend...' : 'Click button above to scan NFC Card'}
                    </span>
                  </div>

                  {/* Manual Override Text Input */}
                  <div className="space-y-1.5 text-left border-t border-slate-900/40 pt-4">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">
                      MANUAL CARD UID OVERRIDE
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={nfcUid}
                        onChange={(e) => setNfcUid(e.target.value)}
                        placeholder="Type card UID"
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-900 rounded-xl focus:border-indigo-500 focus:outline-none text-xs font-semibold text-slate-200 placeholder-slate-700"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Daily Scans overview */}
            {stats?.recentScans && stats.recentScans.length > 0 && (
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <h3 className="font-bold font-heading text-sm text-slate-200 mb-4 flex items-center gap-2">
                  <History className="w-4 h-4 text-slate-400" />
                  Recent Scans Today
                </h3>
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {stats.recentScans.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/30 border border-slate-950/40">
                      <div>
                        <div className="text-xs font-bold text-slate-300">
                          {tx.studentName} <span className="text-[10px] text-slate-500 font-semibold">({tx.studentClass})</span>
                        </div>
                        <div className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                          {tx.status === 'SUCCESS' ? (
                            <span className="text-emerald-500 font-bold uppercase">APPROVED</span>
                          ) : (
                            <span className="text-rose-500 font-bold uppercase" title={tx.reason}>DECLINED</span>
                          )}
                          <span>•</span>
                          <span>{new Date(tx.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <span className={`text-xs font-bold ${tx.status === 'SUCCESS' ? 'text-emerald-400' : 'text-slate-500 line-through'}`}>
                        ₹{tx.amount.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* DYNAMIC VALIDATION RESULT OVERLAY */}
      {showResultOverlay && transactionResult && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-8 rounded-2xl border border-slate-800 text-center relative overflow-hidden animate-float">
            {/* Glowing background highlights */}
            <div className={`absolute -top-20 -left-20 w-48 h-48 rounded-full blur-3xl ${
              transactionResult.success ? 'bg-emerald-500/10' : 'bg-rose-500/10'
            }`} />

            {transactionResult.success ? (
              <div className="flex flex-col items-center">
                <div className="p-4 bg-emerald-500/10 text-emerald-400 rounded-full mb-6 animate-pulse-ring">
                  <CheckCircle className="w-16 h-16" />
                </div>
                <h3 className="text-2xl font-extrabold font-heading text-emerald-400">TRANSACTION APPROVED</h3>
                
                <div className="mt-6 p-4 rounded-xl bg-slate-900/60 border border-slate-800 w-full text-left space-y-2.5">
                  <div className="flex justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-xs text-slate-400">Amount Charged:</span>
                    <span className="text-sm font-bold text-slate-200">₹{transactionResult.transaction.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-2">
                    <span className="text-xs text-slate-400">Student Card:</span>
                    <span className="text-sm font-semibold text-slate-200">{transactionResult.transaction.studentId ? 'Alex Mercer' : 'Student'}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-start gap-1 mt-3">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 text-indigo-400" />
                    <span>{transactionResult.notification ? `FCM Notification dispatched to Parent (${transactionResult.notification.recipient})` : 'Parent notification sent'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="p-4 bg-rose-500/10 text-rose-400 rounded-full mb-6">
                  <XCircle className="w-16 h-16" />
                </div>
                <h3 className="text-2xl font-extrabold font-heading text-rose-500">TRANSACTION DECLINED</h3>
                
                <div className="mt-5 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 text-rose-300 text-sm w-full leading-relaxed">
                  {transactionResult.reason}
                </div>
              </div>
            )}

            <button
              onClick={() => setShowResultOverlay(false)}
              className="mt-8 px-6 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold rounded-xl text-sm transition cursor-pointer"
            >
              Close Overlay
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
