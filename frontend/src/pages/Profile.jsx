import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { User, Gift, MapPin, ClipboardList, ShieldAlert, Award, ChevronRight, Compass } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';

export default function Profile() {
  const navigate = useNavigate();
  const { request } = useApi();
  const { user } = useSelector((state) => state.auth);

  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState('');
  const [addressTitle, setAddressTitle] = useState('Home');

  const fetchProfileDetails = async () => {
    try {
      const pData = await request('/api/auth/profile');
      setProfile(pData);

      const oData = await request('/api/orders/history');
      setOrders(oData || []);

      const aData = await request('/api/auth/addresses');
      setAddresses(aData || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchProfileDetails();
  }, [user, navigate, request]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddress.trim()) return;

    try {
      await request('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({ title: addressTitle, address_line: newAddress })
      });
      setNewAddress('');
      fetchProfileDetails();
    } catch (err) {
      console.error(err);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto"></div>
        <span className="text-xs text-stone-500 mt-2 block">Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Profile Info card */}
      <div className="p-8 rounded-[36px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center font-black text-white text-2xl shadow">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-stone-800 dark:text-white">{profile.name}</h2>
              <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-wider">
                {profile.role}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">{profile.email}</p>
          </div>
        </div>

        {/* Loyalty Points display */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Award size={20} className="animate-bounce" />
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-amber-600 block leading-none">Loyalty points</span>
              <span className="text-lg font-black">{profile.loyalty_points} Pts</span>
            </div>
          </div>
          
          {/* Invite Code display */}
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500">
            <Gift size={20} />
            <div>
              <span className="text-[9px] uppercase font-black tracking-widest text-orange-600 block leading-none">Invite Code</span>
              <span className="text-sm font-black font-mono">{profile.referral_code || ' SARAH444'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Addresses management (1 col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <h3 className="text-base font-extrabold text-stone-850 dark:text-white flex items-center gap-2">
              <MapPin size={18} className="text-orange-500" /> Saved Locations
            </h3>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {addresses.length > 0 ? (
                addresses.map((addr) => (
                  <div key={addr.id} className="p-3 border border-stone-200 dark:border-zinc-900 rounded-xl space-y-0.5">
                    <span className="text-[9px] uppercase font-black tracking-widest text-orange-500">{addr.title}</span>
                    <p className="text-xs text-stone-700 dark:text-stone-300 font-semibold line-clamp-2">{addr.address_line}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400">No address records configured.</p>
              )}
            </div>

            {/* Form */}
            <form onSubmit={handleAddAddress} className="space-y-2 border-t border-stone-100 dark:border-zinc-800/80 pt-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Address details"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                />
                <select
                  value={addressTitle}
                  onChange={(e) => setAddressTitle(e.target.value)}
                  className="bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs px-2 focus:outline-none text-stone-700 dark:text-stone-300 font-bold"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-zinc-950 dark:bg-zinc-800 text-white font-extrabold text-[10px] rounded-xl hover:opacity-90 transition-all uppercase tracking-wider"
              >
                Add Address
              </button>
            </form>
          </div>
        </div>

        {/* Previous Orders history (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
          <h3 className="text-lg font-extrabold text-stone-850 dark:text-white flex items-center gap-2 border-b border-stone-200 dark:border-zinc-800/80 pb-4">
            <ClipboardList size={20} className="text-orange-500" /> Past Orders History
          </h3>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {orders.length > 0 ? (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => navigate(`/orders/tracking?id=${ord.id}`)}
                  className="p-4 border border-stone-200 dark:border-zinc-900 rounded-2xl flex items-center justify-between cursor-pointer hover:border-orange-500/30 dark:hover:border-amber-500/30 transition-all bg-white/40 dark:bg-zinc-900/20 group gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center font-extrabold text-orange-500 text-sm">
                      #{ord.id}
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-stone-850 dark:text-white group-hover:text-orange-500 transition-colors">
                        {ord.restaurant_name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold mt-0.5">
                        <span>{new Date(ord.created_at).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{ord.payment_method.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs sm:text-sm font-black text-stone-800 dark:text-white">${Number(ord.payable_amount).toFixed(2)}</div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-orange-500">{ord.order_status}</span>
                    </div>
                    <ChevronRight size={16} className="text-stone-400 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 rounded-2xl border border-dashed border-stone-250 dark:border-zinc-800/80">
                <p className="text-xs text-stone-500 font-bold mb-3">No orders recorded in your history log yet.</p>
                <Link to="/restaurants" className="inline-flex items-center px-4 py-2 bg-orange-500 text-white font-bold text-[10px] rounded-xl hover:bg-orange-600 transition-colors uppercase tracking-widest gap-1">
                  <Compass size={14} /> Place Your First Order
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
