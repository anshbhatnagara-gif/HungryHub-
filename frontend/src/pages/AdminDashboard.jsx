import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Shield, Users, Compass, DollarSign, Plus, ToggleLeft, ToggleRight, FileSpreadsheet, ShieldAlert, BadgeInfo } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/useApi.js';
import { DashboardSkeleton } from '../components/SkeletonLoader.jsx';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { request, loading } = useApi();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'users', 'coupons'
  const [metrics, setMetrics] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [couponsList, setCouponsList] = useState([]);

  // Coupon Form
  const [newCode, setNewCode] = useState('');
  const [newDiscount, setNewDiscount] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newMin, setNewMin] = useState('');
  const [newExpiry, setNewExpiry] = useState('');

  const fetchAdminData = async () => {
    try {
      const metricsData = await request('/api/admin/metrics');
      setMetrics(metricsData);

      const chartResponse = await request('/api/admin/charts');
      setChartData(chartResponse || []);

      const usersResponse = await request('/api/admin/users');
      setUsersList(usersResponse || []);

      const couponsResponse = await request('/api/admin/coupons');
      setCouponsList(couponsResponse || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchAdminData();
  }, [user, navigate, request]);

  const handleToggleUserActive = async (userId, currentStatus) => {
    try {
      await request('/api/admin/users/toggle', {
        method: 'POST',
        body: JSON.stringify({ userId, is_active: !currentStatus })
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleCouponActive = async (id, currentStatus) => {
    try {
      await request('/api/admin/coupons/toggle', {
        method: 'POST',
        body: JSON.stringify({ id, is_active: !currentStatus })
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCoupon = async (e) => {
    e.preventDefault();
    if (!newCode || !newDiscount || !newMax || !newMin || !newExpiry) return;

    try {
      await request('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.toUpperCase(),
          discount_percent: Number(newDiscount),
          max_discount: Number(newMax),
          min_order_value: Number(newMin),
          expiry_date: newExpiry
        })
      });

      // Clear Form
      setNewCode('');
      setNewDiscount('');
      setNewMax('');
      setNewMin('');
      setNewExpiry('');
      fetchAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await fetch('/api/admin/export', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('hh_token')}` }
      });
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = 'hungryhub_sales_report.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg">
            <Shield size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-stone-850 dark:text-white tracking-tight">Super Admin Dashboard</h1>
            <p className="text-xs text-stone-400 mt-0.5">SaaS Platform Moderation & Analytics Engine</p>
          </div>
        </div>

        {/* Navigation Tab selection */}
        <div className="flex bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Analytics Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            User Moderation ({usersList.length})
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'coupons' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            SaaS Coupons ({couponsList.length})
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'analytics' && metrics && (
        <div className="space-y-8 animate-fadeIn">
          {/* Dashboard Metrics grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/20 border border-stone-200/50 dark:border-zinc-800/80">
              <span className="text-[9px] uppercase font-black text-stone-400">Sales Turnover</span>
              <div className="text-xl font-black text-stone-850 dark:text-white mt-1">${metrics.totalSales.toFixed(2)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/20 border border-stone-200/50 dark:border-zinc-800/80">
              <span className="text-[9px] uppercase font-black text-stone-400">Platform Comm.</span>
              <div className="text-xl font-black text-stone-850 dark:text-white mt-1">${metrics.totalCommission.toFixed(2)}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/20 border border-stone-200/50 dark:border-zinc-800/80">
              <span className="text-[9px] uppercase font-black text-stone-400">Total Users</span>
              <div className="text-xl font-black text-stone-850 dark:text-white mt-1">{metrics.totalUsers}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/20 border border-stone-200/50 dark:border-zinc-800/80">
              <span className="text-[9px] uppercase font-black text-stone-400">Kitchen partners</span>
              <div className="text-xl font-black text-stone-850 dark:text-white mt-1">{metrics.totalRestaurants}</div>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/20 border border-stone-200/50 dark:border-zinc-800/80">
              <span className="text-[9px] uppercase font-black text-stone-400">Total Orders</span>
              <div className="text-xl font-black text-stone-850 dark:text-white mt-1">{metrics.totalOrders}</div>
            </div>
          </div>

          {/* Revenue Chart and Action Controls */}
          <div className="p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Monthly growth trajectory</span>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 bg-zinc-950 dark:bg-zinc-800 hover:opacity-90 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-zinc-950/20 transition-all uppercase tracking-wider"
              >
                <FileSpreadsheet size={14} /> Export Orders CSV
              </button>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Sales" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && (
        <div className="p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
          <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">User registrations directory</span>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-stone-200 dark:border-zinc-850/80 text-stone-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-2">ID</th>
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Email</th>
                  <th className="py-3 px-2">Role</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-150 dark:divide-zinc-900 font-medium">
                {usersList.map((usr) => (
                  <tr key={usr.id} className="text-stone-700 dark:text-stone-300">
                    <td className="py-3.5 px-2 font-mono">#{usr.id}</td>
                    <td className="py-3.5 px-2 font-bold">{usr.name}</td>
                    <td className="py-3.5 px-2">{usr.email}</td>
                    <td className="py-3.5 px-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[9px] font-black uppercase tracking-wider">
                        {usr.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <span className={`text-[10px] font-black uppercase ${
                        usr.is_active === 1 ? 'text-green-500' : 'text-rose-500'
                      }`}>
                        {usr.is_active === 1 ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3.5 px-2">
                      <button
                        onClick={() => handleToggleUserActive(usr.id, usr.is_active === 1)}
                        className={`text-[10px] font-black uppercase hover:underline ${
                          usr.is_active === 1 ? 'text-rose-500' : 'text-green-500'
                        }`}
                      >
                        {usr.is_active === 1 ? 'Suspend' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'coupons' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Coupon creation form (1 col) */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Create discount coupon</span>
            
            <form onSubmit={handleCreateCoupon} className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Coupon Code</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. HUNGRY50"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs uppercase font-bold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1 font-bold">Discount (%)</label>
                  <input
                    type="number"
                    required
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    placeholder="50"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1 font-bold">Max Cap ($)</label>
                  <input
                    type="number"
                    required
                    value={newMax}
                    onChange={(e) => setNewMax(e.target.value)}
                    placeholder="20"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1 font-bold">Min Order ($)</label>
                  <input
                    type="number"
                    required
                    value={newMin}
                    onChange={(e) => setNewMin(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1 font-bold">Expiry Date</label>
                  <input
                    type="date"
                    required
                    value={newExpiry}
                    onChange={(e) => setNewExpiry(e.target.value)}
                    className="w-full px-2 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-stone-700 dark:text-stone-300 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-orange-600 transition-all uppercase tracking-wider flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Coupon
              </button>
            </form>
          </div>

          {/* List of active coupons (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Platform discount codes</span>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-zinc-850/80 text-stone-400 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-2">Code</th>
                    <th className="py-2.5 px-2">Rate %</th>
                    <th className="py-2.5 px-2">Min. Val</th>
                    <th className="py-2.5 px-2">Cap</th>
                    <th className="py-2.5 px-2">Status</th>
                    <th className="py-2.5 px-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-150 dark:divide-zinc-900 font-medium">
                  {couponsList.map((cp) => (
                    <tr key={cp.id} className="text-stone-700 dark:text-stone-300">
                      <td className="py-3 px-2 font-mono font-extrabold text-orange-500">{cp.code}</td>
                      <td className="py-3 px-2">{cp.discount_percent}%</td>
                      <td className="py-3 px-2">${Number(cp.min_order_value).toFixed(2)}</td>
                      <td className="py-3 px-2">${Number(cp.max_discount).toFixed(2)}</td>
                      <td className="py-3 px-2">
                        <span className={`text-[9px] font-black uppercase ${
                          cp.is_active === 1 ? 'text-green-500' : 'text-rose-500'
                        }`}>
                          {cp.is_active === 1 ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <button
                          onClick={() => handleToggleCouponActive(cp.id, cp.is_active === 1)}
                          className="text-[10px] font-black text-stone-500 dark:text-stone-400 hover:text-orange-500 uppercase tracking-widest"
                        >
                          Toggle
                        </button>
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
  );
}
