import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { ChefHat, ClipboardList, TrendingUp, Plus, Trash2, CheckCircle2, PackageCheck, ToggleLeft, ToggleRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useApi } from '../hooks/useApi.js';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { request, loading } = useApi();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'menu', 'analytics'
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);

  // Menu Creation Form
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemImg, setNewItemImg] = useState('');
  const [newItemCat, setNewItemCat] = useState('');

  // Socket setup
  useEffect(() => {
    if (!user || user.role !== 'owner') {
      navigate('/login');
      return;
    }

    const fetchOwnerData = async () => {
      try {
        // Fetch global categories
        const cats = await request('/api/restaurants/categories');
        setCategories(cats || []);
        if (cats && cats.length > 0) setNewItemCat(cats[0].id);

        // Fetch user restaurant details
        // Note: owner_id is user.id, backend returns list or searches
        const restaurantsList = await request('/api/restaurants');
        const myRest = restaurantsList.find(r => r.owner_id === user.id);
        if (myRest) {
          setRestaurant(myRest);

          const mItems = await request(`/api/restaurants/${myRest.id}/menu`);
          setMenuItems(mItems || []);

          const ordData = await request('/api/orders/restaurant/list');
          setOrders(ordData || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchOwnerData();
  }, [user, navigate, request]);

  // Real-time socket connections for incoming orders
  useEffect(() => {
    if (!restaurant) return;

    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socket.emit('join_role', 'owner');

    socket.on('status_update', (data) => {
      // Re-fetch orders list when status triggers
      const fetchOrders = async () => {
        const ordData = await request('/api/orders/restaurant/list');
        setOrders(ordData || []);
      };
      fetchOrders();
    });

    return () => {
      socket.disconnect();
    };
  }, [restaurant, request]);

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await request('/api/orders/restaurant/status', {
        method: 'POST',
        body: JSON.stringify({ orderId, status })
      });
      // Fire socket update event
      const socket = io('http://localhost:5000');
      socket.emit('status_change', {
        orderId,
        status,
        message: `Restaurant updated order status to ${status}.`
      });
      
      // Update local list
      const ordData = await request('/api/orders/restaurant/list');
      setOrders(ordData || []);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateMenuItem = async (e) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice) return;

    try {
      // Let's create the menu item
      // We will perform a custom request to backend to mock menu insertions
      if (db.isMock()) {
        const newId = menuItems.length + 1;
        const newItem = {
          id: newId,
          restaurant_id: restaurant.id,
          category_id: Number(newItemCat),
          name: newItemName,
          description: newItemDesc,
          price: Number(newItemPrice),
          image_url: newItemImg || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
          is_veg: 1,
          is_available: 1
        };
        mockDB.menu_items.push(newItem);
        setMenuItems([...menuItems, newItem]);
      } else {
        await request(`/api/restaurants/${restaurant.id}/menu`, {
          method: 'POST',
          body: JSON.stringify({
            name: newItemName,
            description: newItemDesc,
            price: Number(newItemPrice),
            image_url: newItemImg,
            category_id: Number(newItemCat)
          })
        });
        const mItems = await request(`/api/restaurants/${restaurant.id}/menu`);
        setMenuItems(mItems || []);
      }

      // Reset Form
      setNewItemName('');
      setNewItemDesc('');
      setNewItemPrice('');
      setNewItemImg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!confirm('Are you sure you want to remove this dish?')) return;
    try {
      if (db.isMock()) {
        mockDB.menu_items = mockDB.menu_items.filter(i => i.id !== itemId);
        setMenuItems(menuItems.filter(i => i.id !== itemId));
      } else {
        await request(`/api/restaurants/${restaurant.id}/menu/${itemId}`, { method: 'DELETE' });
        const mItems = await request(`/api/restaurants/${restaurant.id}/menu`);
        setMenuItems(mItems || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Mock revenue chart coordinates
  const revenueChartData = [
    { name: 'Mon', Revenue: 240 },
    { name: 'Tue', Revenue: 380 },
    { name: 'Wed', Revenue: 310 },
    { name: 'Thu', Revenue: 480 },
    { name: 'Fri', Revenue: 620 },
    { name: 'Sat', Revenue: 850 },
    { name: 'Sun', Revenue: 790 }
  ];

  if (!restaurant) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold">No Restaurant Profile Connected.</h2>
        <p className="text-xs text-stone-500">Contact admin to assign owner profiles.</p>
      </div>
    );
  }

  const netSales = orders
    .filter(o => o.order_status === 'delivered')
    .reduce((sum, o) => sum + Number(o.payable_amount), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg">
            <ChefHat size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">{restaurant.name}</h1>
            <p className="text-xs text-stone-400 mt-0.5">{restaurant.address} | Rating: {restaurant.rating}</p>
          </div>
        </div>

        {/* Tab triggers */}
        <div className="flex bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'orders' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Orders Queue ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'menu' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Dishes Menu ({menuItems.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'analytics' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            Sales Analytics
          </button>
        </div>
      </div>

      {/* Tabs panels */}
      {activeTab === 'orders' && (
        <div className="p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-150 dark:border-zinc-900 pb-4">
            <ClipboardList className="text-orange-500" size={20} />
            <h2 className="text-lg font-black text-stone-850 dark:text-white">Active Order Pipelines</h2>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {orders.length > 0 ? (
              orders.map((ord) => (
                <div
                  key={ord.id}
                  className="p-4 border border-stone-200 dark:border-zinc-900 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 dark:bg-zinc-900/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-stone-850 dark:text-white">Order #{ord.id}</span>
                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                        ord.payment_status === 'completed' ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'
                      }`}>
                        {ord.payment_status}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-400 font-medium">Customer: {ord.customer_name} ({ord.customer_phone})</p>
                    <p className="text-xs text-stone-500 dark:text-stone-500 line-clamp-1">Address: {ord.delivery_address}</p>
                    <p className="text-[10px] text-stone-400 font-bold">Total Payout: ${Number(ord.payable_amount).toFixed(2)} | Method: {ord.payment_method.toUpperCase()}</p>
                  </div>

                  {/* Actions based on current status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {ord.order_status === 'placed' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'preparing')}
                        className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-orange-500/20 transition-all"
                      >
                        <PackageCheck size={14} /> Accept & Prepare
                      </button>
                    )}
                    {ord.order_status === 'preparing' && (
                      <button
                        onClick={() => handleUpdateStatus(ord.id, 'ready')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-md shadow-green-600/20 transition-all"
                      >
                        <CheckCircle2 size={14} /> Ready for Rider
                      </button>
                    )}
                    {ord.order_status === 'ready' && (
                      <span className="text-xs font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                        Waiting for Courier assignment
                      </span>
                    )}
                    {ord.order_status === 'out_for_delivery' && (
                      <span className="text-xs font-bold text-purple-500 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl">
                        Courier out for delivery
                      </span>
                    )}
                    {ord.order_status === 'delivered' && (
                      <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1">
                        <CheckCircle2 size={12} /> Delivered
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center py-10 text-xs text-stone-400">Your kitchen orders dashboard is currently idle.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'menu' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Menu Creation Form (1 col) */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Add Menu Item</span>
            
            <form onSubmit={handleCreateMenuItem} className="space-y-4">
              <div>
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Dish Name</label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Lobster Thermidor"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Description</label>
                <textarea
                  value={newItemDesc}
                  onChange={(e) => setNewItemDesc(e.target.value)}
                  placeholder="Briefly details the ingredients..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1 font-bold">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    placeholder="24.99"
                    className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-stone-400 block mb-1 font-bold">Category</label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full px-2 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none font-bold text-stone-700 dark:text-stone-300"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Image URL</label>
                <input
                  type="text"
                  value={newItemImg}
                  onChange={(e) => setNewItemImg(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-orange-500 text-white font-extrabold text-xs rounded-xl shadow-md hover:bg-orange-600 transition-all uppercase tracking-wider flex items-center justify-center gap-1"
              >
                <Plus size={14} /> Add Dish
              </button>
            </form>
          </div>

          {/* Menu Items Table (2 cols) */}
          <div className="lg:col-span-2 p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Kitchen Menu Listing</span>

            <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
              {menuItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3.5 border border-stone-200/50 dark:border-zinc-900 rounded-2xl bg-white/40 dark:bg-zinc-900/20 gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0">
                      <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-stone-850 dark:text-white line-clamp-1">{item.name}</h4>
                      <span className="text-xs font-black text-orange-500">${item.price.toFixed(2)}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-2 text-stone-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Card Summary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                $
              </div>
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Total Net Sales</span>
                <h4 className="text-xl font-black text-stone-855 dark:text-white mt-0.5">${netSales.toFixed(2)}</h4>
              </div>
            </div>

            <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Completed Orders</span>
                <h4 className="text-xl font-black text-stone-855 dark:text-white mt-0.5">
                  {orders.filter(o => o.order_status === 'delivered').length} Orders
                </h4>
              </div>
            </div>

            <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold">
                %
              </div>
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Platform Comm. Rate</span>
                <h4 className="text-xl font-black text-stone-855 dark:text-white mt-0.5">{restaurant.commission_rate}%</h4>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="text-orange-500" size={18} />
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Weekly Payout Growth Chart</span>
            </div>

            <div className="w-full h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ea580c" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="Revenue" stroke="#ea580c" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Help resolve db mocks in Owner UI
const db = { isMock: () => true };
const mockDB = { menu_items: [] };
