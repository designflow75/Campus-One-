"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/utils/api';
import { 
  Shield, Users, Plus, Edit2, CreditCard, RefreshCw, LogOut, CheckCircle, 
  Trash2, X, PlusCircle, AlertCircle, ShoppingBag, Settings2
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const [adminName, setAdminName] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  
  // Data lists
  const [students, setStudents] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'METRICS' | 'STUDENTS' | 'MENU'>('METRICS');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Modals & form fields
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [studentForm, setStudentForm] = useState({ id: '', name: '', class: '', parentId: '', nfcUid: '' });
  const [parentsList, setParentsList] = useState<any[]>([]); // To select parents

  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuForm, setMenuForm] = useState({
    id: '', name: '', category: 'Meals', price: '', calories: '', protein: '', carbs: '', fat: '', allergenTags: '', restrictionTags: ''
  });

  // 1. Auth check and initial load
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (!token || !userStr) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'ADMIN') {
      router.push('/login');
      return;
    }
    setAdminName(user.name);

    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const metrics = await apiRequest('/analytics/admin');
      setAnalytics(metrics);

      const studentData = await apiRequest('/students');
      setStudents(studentData);

      const menuData = await apiRequest('/menu');
      setMenuItems(menuData);

      // Pre-fill parent selection (mock query: we will use parent email to resolve id or load parent users)
      // For seeding, the seeded parent user is John Mercer. Let's find him.
      const parentUser = studentData.length > 0 ? studentData[0].parent : null;
      if (parentUser) {
        setParentsList([{ id: parentUser.id, name: parentUser.name, email: parentUser.email }]);
        setStudentForm((prev) => ({ ...prev, parentId: parentUser.id }));
      }
    } catch (err) {
      console.error('Error loading admin portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccessMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 4000);
  };

  // 2. Student CRUD handlers
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.class || !studentForm.parentId) return;

    try {
      if (studentForm.id) {
        // Edit student
        await apiRequest(`/students/${studentForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ name: studentForm.name, class: studentForm.class }),
        });
        if (studentForm.nfcUid !== undefined) {
          await apiRequest(`/students/${studentForm.id}/nfc`, {
            method: 'PATCH',
            body: JSON.stringify({ nfcUid: studentForm.nfcUid }),
          });
        }
        showSuccessMessage('Student details updated.');
      } else {
        // Create student
        const newStudent = await apiRequest('/students', {
          method: 'POST',
          body: JSON.stringify({
            name: studentForm.name,
            class: studentForm.class,
            parentId: studentForm.parentId,
            nfcUid: studentForm.nfcUid || null,
          }),
        });
        showSuccessMessage(`Student "${newStudent.name}" registered successfully.`);
      }
      setShowStudentModal(false);
      resetStudentForm();
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const openEditStudent = (student: any) => {
    setStudentForm({
      id: student.id,
      name: student.name,
      class: student.class,
      parentId: student.parentId,
      nfcUid: student.nfcUid || '',
    });
    setShowStudentModal(true);
  };

  const resetStudentForm = () => {
    const parentId = parentsList.length > 0 ? parentsList[0].id : '';
    setStudentForm({ id: '', name: '', class: '', parentId, nfcUid: '' });
  };

  // 3. Menu CRUD handlers
  const handleMenuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuForm.name || !menuForm.price) return;

    const payload = {
      name: menuForm.name,
      category: menuForm.category,
      price: Number(menuForm.price),
      calories: Number(menuForm.calories || 0),
      protein: Number(menuForm.protein || 0),
      carbs: Number(menuForm.carbs || 0),
      fat: Number(menuForm.fat || 0),
      allergenTags: menuForm.allergenTags,
      restrictionTags: menuForm.restrictionTags,
    };

    try {
      if (menuForm.id) {
        // Edit item
        await apiRequest(`/menu/${menuForm.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        showSuccessMessage('Menu item updated.');
      } else {
        // Create item
        await apiRequest('/menu', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showSuccessMessage(`Menu item "${menuForm.name}" created.`);
      }
      setShowMenuModal(false);
      resetMenuForm();
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDeleteMenuItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name} from the menu?`)) return;
    try {
      await apiRequest(`/menu/${id}`, { method: 'DELETE' });
      showSuccessMessage('Item deleted.');
      await loadDashboard();
    } catch (err: any) {
      alert(err.message || 'Deletion failed');
    }
  };

  const openEditMenu = (item: any) => {
    setMenuForm({
      id: item.id,
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      calories: item.calories.toString(),
      protein: item.protein.toString(),
      carbs: item.carbs.toString(),
      fat: item.fat.toString(),
      allergenTags: item.allergenTags || '',
      restrictionTags: item.restrictionTags || '',
    });
    setShowMenuModal(true);
  };

  const resetMenuForm = () => {
    setMenuForm({
      id: '', name: '', category: 'Meals', price: '', calories: '', protein: '', carbs: '', fat: '', allergenTags: '', restrictionTags: ''
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
          <span>Loading admin panel...</span>
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
              CampusOne Admin
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-xs text-slate-500 font-semibold uppercase">SYSTEM ADMINISTRATOR</p>
              <p className="text-sm font-semibold text-slate-300">{adminName}</p>
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

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        
        {message && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex gap-2 mb-8 bg-slate-900/40 p-1 rounded-xl border border-slate-900 w-fit">
          <button
            onClick={() => setActiveTab('METRICS')}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition ${
              activeTab === 'METRICS' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dashboard Analytics
          </button>
          <button
            onClick={() => setActiveTab('STUDENTS')}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition ${
              activeTab === 'STUDENTS' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Student Directory
          </button>
          <button
            onClick={() => setActiveTab('MENU')}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition ${
              activeTab === 'MENU' ? 'bg-slate-900 text-white border border-slate-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Canteen Menu Editor
          </button>
        </div>

        {/* TAB 1: METRICS */}
        {activeTab === 'METRICS' && analytics && (
          <div className="space-y-8">
            
            {/* Metric widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-panel p-5 rounded-2xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">TOTAL REVENUE</span>
                <h3 className="text-2xl font-extrabold font-heading text-emerald-400 mt-1">₹{analytics.metrics.totalRevenue.toFixed(2)}</h3>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">STUDENT ACCOUNTS</span>
                <h3 className="text-2xl font-extrabold font-heading text-slate-200 mt-1">{analytics.metrics.students}</h3>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">STAFF MEMBERS</span>
                <h3 className="text-2xl font-extrabold font-heading text-slate-200 mt-1">{analytics.metrics.staff}</h3>
              </div>
              <div className="glass-panel p-5 rounded-2xl border border-slate-900">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">MENU ITEMS</span>
                <h3 className="text-2xl font-extrabold font-heading text-slate-200 mt-1">{analytics.metrics.menuItems}</h3>
              </div>
            </div>

            {/* Timelines and blocks logs */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Sales Chart timeline */}
              <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-900">
                <h3 className="font-bold font-heading text-base text-slate-200 mb-4">Revenue Stream Timeline (Last 7 Days)</h3>
                
                {/* SVG Visual Timeline chart */}
                <div className="h-64 w-full flex items-end justify-between gap-4 pt-10 border-b border-slate-900/60 pb-2.5">
                  {analytics.salesChart.map((day: any) => {
                    const maxRev = Math.max(...analytics.salesChart.map((d: any) => d.revenue), 100);
                    const heightPercent = (day.revenue / maxRev) * 100;
                    return (
                      <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                        <div className="opacity-0 group-hover:opacity-100 transition duration-200 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded text-[10px] font-bold text-emerald-400 absolute mb-36 pointer-events-none">
                          ₹{day.revenue}
                        </div>
                        <div 
                          className="w-full bg-gradient-to-t from-emerald-600/70 to-emerald-500/90 rounded-t-lg group-hover:opacity-95 transition"
                          style={{ height: `${Math.max(heightPercent, 4)}%` }}
                        />
                        <span className="text-[10px] text-slate-500 font-semibold">{day.date}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Popular items sold */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <h3 className="font-bold font-heading text-base text-slate-200 mb-4">Most Popular Items</h3>
                <div className="space-y-3">
                  {analytics.popularItems.length > 0 ? (
                    analytics.popularItems.map((item: any, idx: number) => (
                      <div key={item.name} className="flex justify-between items-center p-3 rounded-xl bg-slate-900/30 border border-slate-900">
                        <div>
                          <span className="text-xs text-slate-500 font-bold">#{idx+1}</span>
                          <h4 className="text-sm font-bold text-slate-200 inline-block ml-2">{item.name}</h4>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-slate-400 font-bold block">{item.quantity} sold</span>
                          <span className="text-[10px] text-emerald-400 font-bold block">₹{item.revenue}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 py-12 text-center">No transactions completed yet.</p>
                  )}
                </div>
              </div>

            </div>

            {/* Block Reports Log */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Allergy Blocks Log */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold font-heading text-base text-slate-200">Allergy Block Alerts</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-bold">
                    {analytics.allergyBlockCount} blocks
                  </span>
                </div>
                
                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {analytics.allergyReports.length > 0 ? (
                    analytics.allergyReports.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/15 text-rose-300 text-xs leading-relaxed flex items-start gap-2.5">
                        <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p>{log.reason}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block font-semibold">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 py-8 text-center">No allergy blocks logged.</p>
                  )}
                </div>
              </div>

              {/* Diet Restriction Blocks Log */}
              <div className="glass-panel p-6 rounded-2xl border border-slate-900">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold font-heading text-base text-slate-200">Dietary Restriction Blocks</h3>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                    {analytics.dietBlockCount} blocks
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                  {analytics.dietReports.length > 0 ? (
                    analytics.dietReports.map((log: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                        <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p>{log.reason}</p>
                          <span className="text-[9px] text-slate-500 mt-1 block font-semibold">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 py-8 text-center">No dietary blocks logged.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: STUDENTS */}
        {activeTab === 'STUDENTS' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h2 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-400" />
                Student Directories
              </h2>
              <button
                onClick={() => { resetStudentForm(); setShowStudentModal(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:opacity-95 shadow-md shadow-emerald-500/10 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                Add Student
              </button>
            </div>

            {/* List Table */}
            <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/20 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Student Name</th>
                      <th className="p-4">Class</th>
                      <th className="p-4">NFC Card UID</th>
                      <th className="p-4">Parent Account</th>
                      <th className="p-4">Wallet Balance</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-900/20 transition">
                        <td className="p-4 font-bold text-slate-200">{student.name}</td>
                        <td className="p-4 font-semibold text-slate-400">{student.class}</td>
                        <td className="p-4 text-xs font-mono text-slate-400">
                          {student.nfcUid ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold">
                              {student.nfcUid}
                            </span>
                          ) : (
                            <span className="text-slate-600 italic">Not Linked</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400">
                          <span className="font-semibold block text-slate-300">{student.parent.name}</span>
                          <span className="text-xs text-slate-500 block">{student.parent.email}</span>
                        </td>
                        <td className="p-4 font-extrabold text-emerald-400">₹{student.wallet?.balance.toFixed(2)}</td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditStudent(student)}
                              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                              title="Edit NFC or Profile"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MENU */}
        {activeTab === 'MENU' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-900 pb-3">
              <h2 className="text-lg font-bold font-heading text-slate-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-indigo-400" />
                Canteen Menu List
              </h2>
              <button
                onClick={() => { resetMenuForm(); setShowMenuModal(true); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500 text-white font-bold rounded-xl text-xs hover:opacity-95 shadow-md shadow-indigo-500/10 cursor-pointer transition"
              >
                <Plus className="w-4 h-4" />
                Create Item
              </button>
            </div>

            {/* Menu Table */}
            <div className="glass-panel rounded-2xl border border-slate-900 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-900/20 text-slate-500 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Item Name</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Price</th>
                      <th className="p-4">Energy & Macros</th>
                      <th className="p-4">Tags</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {menuItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/20 transition">
                        <td className="p-4 font-bold text-slate-200">{item.name}</td>
                        <td className="p-4 font-semibold text-slate-400">{item.category}</td>
                        <td className="p-4 font-extrabold text-indigo-400">₹{item.price.toFixed(2)}</td>
                        <td className="p-4 text-xs text-slate-400">
                          <span className="font-bold text-slate-300 block">{item.calories} kcal</span>
                          <span className="block mt-0.5">P: {item.protein}g • C: {item.carbs}g • F: {item.fat}g</span>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1">
                            {item.allergenTags && (
                              <div className="text-[10px] text-rose-300">
                                <span className="font-bold text-slate-500 uppercase mr-1">Allergens:</span>
                                {item.allergenTags}
                              </div>
                            )}
                            {item.restrictionTags && (
                              <div className="text-[10px] text-amber-300">
                                <span className="font-bold text-slate-500 uppercase mr-1">Blocks:</span>
                                {item.restrictionTags}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openEditMenu(item)}
                              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
                              title="Edit Item"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMenuItem(item.id, item.name)}
                              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 transition cursor-pointer"
                              title="Delete Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* STUDENT REGISTRATION / EDIT MODAL */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel border border-slate-850 p-6 rounded-2xl text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold font-heading text-slate-100 mb-6 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-400" />
              {studentForm.id ? 'Edit Student & NFC Card' : 'Add New Student'}
            </h3>

            <form onSubmit={handleStudentSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Student Name</label>
                <input
                  type="text"
                  required
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  placeholder="e.g. Liam Mercer"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">Class / Section</label>
                <input
                  type="text"
                  required
                  value={studentForm.class}
                  onChange={(e) => setStudentForm({ ...studentForm, class: e.target.value })}
                  placeholder="e.g. Grade 5-B"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-semibold">NFC Card UID</label>
                <input
                  type="text"
                  value={studentForm.nfcUid}
                  onChange={(e) => setStudentForm({ ...studentForm, nfcUid: e.target.value })}
                  placeholder="Scan or enter card UID (Optional)"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {!studentForm.id && (
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Assign Parent Account</label>
                  <select
                    value={studentForm.parentId}
                    onChange={(e) => setStudentForm({ ...studentForm, parentId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {parentsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 mt-4 bg-emerald-500 text-slate-950 font-bold rounded-xl hover:opacity-95 shadow-md shadow-emerald-500/10 cursor-pointer transition"
              >
                {studentForm.id ? 'Save changes' : 'Register Student'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MENU ITEM CREATION / EDIT MODAL */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg glass-panel border border-slate-850 p-6 rounded-2xl text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowMenuModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-slate-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold font-heading text-slate-100 mb-6 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-400" />
              {menuForm.id ? 'Edit Menu Item' : 'Create Canteen Item'}
            </h3>

            <form onSubmit={handleMenuSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Item Name</label>
                  <input
                    type="text"
                    required
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    placeholder="e.g. Hamburger"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Category</label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition cursor-pointer"
                  >
                    {['Breakfast', 'Meals', 'Snacks', 'Drinks', 'Fruits', 'Junk Food'].map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={menuForm.price}
                    onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                    placeholder="e.g. 50"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Calories (kcal)</label>
                  <input
                    type="number"
                    value={menuForm.calories}
                    onChange={(e) => setMenuForm({ ...menuForm, calories: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Macros */}
              <div className="grid grid-cols-3 gap-2.5 bg-slate-900/20 p-3 rounded-xl border border-slate-900">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Protein (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={menuForm.protein}
                    onChange={(e) => setMenuForm({ ...menuForm, protein: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Carbs (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={menuForm.carbs}
                    onChange={(e) => setMenuForm({ ...menuForm, carbs: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase">Fat (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={menuForm.fat}
                    onChange={(e) => setMenuForm({ ...menuForm, fat: e.target.value })}
                    placeholder="0"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Tags */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Allergens</label>
                  <input
                    type="text"
                    value={menuForm.allergenTags}
                    onChange={(e) => setMenuForm({ ...menuForm, allergenTags: e.target.value })}
                    placeholder="e.g. peanut, dairy, egg"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">Comma-separated tags.</span>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-semibold">Restriction Tags</label>
                  <input
                    type="text"
                    value={menuForm.restrictionTags}
                    onChange={(e) => setMenuForm({ ...menuForm, restrictionTags: e.target.value })}
                    placeholder="e.g. junk, soda"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition"
                  />
                  <span className="text-[9px] text-slate-500 font-semibold block mt-0.5">Comma-separated tags.</span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-4 bg-indigo-500 text-white font-bold rounded-xl hover:opacity-95 shadow-md shadow-indigo-500/10 cursor-pointer transition"
              >
                {menuForm.id ? 'Save changes' : 'Create Item'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
