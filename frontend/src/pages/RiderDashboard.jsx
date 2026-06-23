import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Navigation, Bike, Power, ClipboardList, Wallet, MapPin, CheckCircle2, Award, Route } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';

export default function RiderDashboard() {
  const navigate = useNavigate();
  const { request } = useApi();
  const { user } = useSelector((state) => state.auth);

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'active', 'earnings'
  const [rider, setRider] = useState(null);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [deliveriesHistory, setDeliveriesHistory] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);

  // Availability
  const [isOnline, setIsOnline] = useState(false);

  // Location Simulation
  const [drivingSim, setDrivingSim] = useState(false);
  const [driveProgress, setDriveProgress] = useState(0);
  const [eta, setEta] = useState('15 mins');
  const socketRef = useRef(null);

  const fetchRiderData = async () => {
    try {
      const data = await request('/api/orders/rider/earnings');
      setRider(data.rider);
      setIsOnline(data.rider.status === 'online');
      setDeliveriesHistory(data.deliveries || []);

      // If active order exists (rider accepted but not completed)
      // Check orders list for accepted
      const allRiderOrders = data.deliveries || [];
      // Let's call available list
      const avail = await request('/api/orders/rider/available');
      setAvailableOrders(avail || []);

      // Check if there is currently an active delivery assigned to this rider
      const activeCheck = await request('/api/orders/history'); // Mock or general fetch
      // Or check availability details
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'rider') {
      navigate('/login');
      return;
    }
    fetchRiderData();
  }, [user, navigate, request]);

  // Connect socket connection
  useEffect(() => {
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    
    socket.emit('join_role', 'rider');
    return () => {
      socket.disconnect();
    };
  }, []);

  const handleToggleOnline = async () => {
    const newStatus = isOnline ? 'offline' : 'online';
    setIsOnline(!isOnline);
    try {
      await request('/api/orders/rider/status', {
        method: 'POST',
        body: JSON.stringify({ status: newStatus })
      });
      fetchRiderData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAcceptOrder = async (order) => {
    try {
      await request('/api/orders/rider/accept', {
        method: 'POST',
        body: JSON.stringify({ orderId: order.id })
      });
      
      // Fire status socket transition
      socketRef.current.emit('status_change', {
        orderId: order.id,
        status: 'out_for_delivery',
        message: 'Rider picked up order and is on the way.'
      });

      setActiveOrder(order);
      setActiveTab('active');
      setDriveProgress(0);
      setDrivingSim(false);
      fetchRiderData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleStartGPS = () => {
    if (drivingSim) return;
    setDrivingSim(true);
    setDriveProgress(0);

    // Simulated Lat/Long updates
    // Restaurant: 12.971598, 77.594562
    // Customer: 12.972442, 77.590643
    const restLat = 12.971598;
    const restLng = 77.594562;
    const custLat = 12.972442;
    const custLng = 77.590643;

    let localProgress = 0;
    const driveInterval = setInterval(() => {
      localProgress += 0.1; // 10% progress every step
      if (localProgress >= 1) {
        localProgress = 1;
        clearInterval(driveInterval);
        setDrivingSim(false);
      }

      setDriveProgress(Math.floor(localProgress * 100));

      const currentLat = restLat + (custLat - restLat) * localProgress;
      const currentLng = restLng + (custLng - restLng) * localProgress;
      const currentETA = Math.ceil((1 - localProgress) * 15);
      setEta(currentETA > 0 ? `${currentETA} mins` : 'Arrived!');

      // Emit coordinates over socket to let customer and admin track in real-time!
      socketRef.current.emit('update_location', {
        orderId: activeOrder.id,
        latitude: currentLat,
        longitude: currentLng,
        heading: 45,
        eta: currentETA > 0 ? `${currentETA} mins` : 'Arrived!'
      });
    }, 1200);
  };

  const handleCompleteDelivery = async () => {
    try {
      await request('/api/orders/rider/complete', {
        method: 'POST',
        body: JSON.stringify({ orderId: activeOrder.id })
      });

      socketRef.current.emit('status_change', {
        orderId: activeOrder.id,
        status: 'delivered',
        message: 'Rider marked order as delivered.'
      });

      setActiveOrder(null);
      setActiveTab('orders');
      fetchRiderData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!rider) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto"></div>
        <span className="text-xs text-stone-500 mt-2 block">Verifying rider route permissions...</span>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header Panel */}
      <div className="p-8 rounded-[36px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-md">
            <Bike size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-stone-850 dark:text-white">Courier Partner Console</h2>
              <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                isOnline ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'
              }`}>
                {isOnline ? 'Active Online' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">Vehicle: {rider.vehicle_number} | {rider.vehicle_type}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleToggleOnline}
            className={`px-4 py-2.5 rounded-2xl font-extrabold text-xs flex items-center gap-1.5 shadow-md transition-all ${
              isOnline 
                ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/10' 
                : 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/10'
            }`}
          >
            <Power size={14} /> {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="flex bg-stone-100 dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'orders' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Available Orders ({availableOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('active')}
          disabled={!activeOrder}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50 ${
            activeTab === 'active' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Active Job {activeOrder ? '(1)' : ''}
        </button>
        <button
          onClick={() => setActiveTab('earnings')}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'earnings' ? 'bg-orange-500 text-white shadow-md' : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Earnings Payouts
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'orders' && (
        <div className="p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
          <div className="flex items-center gap-2 border-b border-stone-150 dark:border-zinc-900 pb-4">
            <ClipboardList className="text-orange-500" size={20} />
            <h2 className="text-lg font-black text-stone-850 dark:text-white font-sans">Available Pickups</h2>
          </div>

          {!isOnline ? (
            <div className="text-center py-10 text-xs text-stone-500">You must toggle online status to view available food deliveries.</div>
          ) : availableOrders.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableOrders.map((ord) => (
                <div key={ord.id} className="p-5 border border-stone-200 dark:border-zinc-900 rounded-2xl space-y-4 bg-white/40 dark:bg-zinc-900/20 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-stone-850 dark:text-white">Order #{ord.id}</span>
                      <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">+$5.00 flat + Tip</span>
                    </div>
                    <div className="space-y-1 text-xs text-stone-600 dark:text-stone-400 font-bold">
                      <div className="flex items-start gap-1">
                        <span className="text-orange-500 shrink-0">🏪</span>
                        <div className="line-clamp-1">{ord.restaurant_name} ({ord.restaurant_address})</div>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="text-blue-500 shrink-0">🏠</span>
                        <div className="line-clamp-1">{ord.delivery_address}</div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleAcceptOrder(ord)}
                    className="w-full py-2 bg-zinc-950 dark:bg-zinc-800 hover:opacity-90 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-opacity"
                  >
                    Accept & Dispatch
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-10 text-xs text-stone-400">No pending orders ready for pickup. Waiting for restaurants...</p>
          )}
        </div>
      )}

      {activeTab === 'active' && activeOrder && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Active Job coordinates driving (2 cols) */}
          <div className="md:col-span-2 p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
            <h3 className="text-base font-extrabold text-stone-850 dark:text-white flex items-center gap-2">
              <Navigation className="text-orange-500" size={18} /> GPS Route Navigation
            </h3>

            {/* GPS driving simulation visual */}
            <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-6 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-zinc-500 font-bold">Route Progress</span>
                <span className="text-purple-400 font-black">{driveProgress}% Completed</span>
              </div>
              
              <div className="w-full bg-zinc-900 rounded-full h-3.5 overflow-hidden border border-zinc-800">
                <div 
                  style={{ width: `${driveProgress}%` }}
                  className="bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-1000"
                ></div>
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                <span>Napoli Pizzeria</span>
                <span>SARAH (Home)</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {driveProgress < 100 ? (
                <button
                  onClick={handleStartGPS}
                  disabled={drivingSim}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-purple-600/25 transition-all"
                >
                  <Route size={14} /> {drivingSim ? 'Simulating Transit...' : 'Start Driving GPS'}
                </button>
              ) : (
                <button
                  onClick={handleCompleteDelivery}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-lg shadow-emerald-600/25 transition-all"
                >
                  <CheckCircle2 size={14} /> Mark as Delivered
                </button>
              )}
            </div>
          </div>

          {/* Active Job Info Details (1 col) */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-4 text-xs text-stone-600 dark:text-stone-400 font-bold">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Job Details</span>
            
            <div className="space-y-1">
              <span className="text-stone-850 dark:text-stone-200 block text-sm font-black">Order ID: #{activeOrder.id}</span>
              <p>ETA to destination: <span className="text-orange-500 font-black">{eta}</span></p>
            </div>

            <div className="border-t border-stone-200 dark:border-zinc-850 pt-3 space-y-2">
              <div>
                <span className="text-[9px] uppercase text-stone-400 block font-black">Pickup Address</span>
                <span className="text-stone-850 dark:text-stone-200 font-semibold">{activeOrder.restaurant_name} ({activeOrder.restaurant_address})</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-stone-400 block font-black">Delivery Address</span>
                <span className="text-stone-850 dark:text-stone-200 font-semibold">{activeOrder.delivery_address}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'earnings' && (
        <div className="space-y-8">
          {/* Cards Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
                <Wallet size={18} />
              </div>
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Total Life Earnings</span>
                <h4 className="text-xl font-black text-stone-855 dark:text-white mt-0.5">${Number(rider.earnings).toFixed(2)}</h4>
              </div>
            </div>

            <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <span className="text-[9px] uppercase font-black tracking-widest text-stone-400">Completed Payouts</span>
                <h4 className="text-xl font-black text-stone-855 dark:text-white mt-0.5">{deliveriesHistory.length} Shipments</h4>
              </div>
            </div>
          </div>

          {/* History table */}
          <div className="p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Shipment delivery logs</span>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {deliveriesHistory.length > 0 ? (
                deliveriesHistory.map((d) => (
                  <div key={d.id} className="flex justify-between items-center p-3 border border-stone-200/50 dark:border-zinc-900 rounded-2xl bg-white/40 dark:bg-zinc-900/20">
                    <div className="space-y-0.5">
                      <h4 className="text-xs sm:text-sm font-extrabold text-stone-850 dark:text-white">Delivery Payout #{d.id}</h4>
                      <span className="text-[9px] text-stone-400 block">{d.restaurant_name} | {new Date(d.updated_at).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-green-600 dark:text-green-400">+$5.00</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-xs text-stone-400">No completed orders records. Accept available pickups to start earning.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
