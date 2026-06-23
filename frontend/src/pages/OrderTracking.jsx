import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { io } from 'socket.io-client';
import { CheckCircle2, Clock, MapPin, Phone, ShoppingBag, Sparkles, Navigation } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';

export default function OrderTracking() {
  const { search } = useLocation();
  const { request, loading } = useApi();
  const params = new URLSearchParams(search);
  const orderId = params.get('id');

  const [orderData, setOrderData] = useState(null);
  const [orderStatus, setOrderStatus] = useState('placed'); // default
  
  // Rider coordinates simulation
  const [riderCoords, setRiderCoords] = useState({ x: 40, y: 30 }); // Starts at restaurant
  const [eta, setEta] = useState('15 mins');
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef = useRef(null);

  // Constants for map layout:
  // Customer: {x: 80, y: 70}
  // Restaurant: {x: 30, y: 30}
  const restaurantCoords = { x: 30, y: 30 };
  const customerCoords = { x: 80, y: 70 };

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetails = async () => {
      try {
        const data = await request(`/api/orders/${orderId}`);
        setOrderData(data);
        setOrderStatus(data.order.order_status);
      } catch (err) {
        console.error(err);
      }
    };

    fetchOrderDetails();
    
    // Poll updates every 6 seconds to capture changes in database status
    const interval = setInterval(fetchOrderDetails, 6000);
    return () => clearInterval(interval);
  }, [orderId, request]);

  // Connect to Socket.IO for coordinates & status broadcast
  useEffect(() => {
    if (!orderId) return;

    // Establish WebSocket Connection
    const socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setSocketConnected(true);
      socket.emit('join_order', orderId);
    });

    socket.on('status_update', (data) => {
      if (data.orderId === Number(orderId)) {
        setOrderStatus(data.status);
      }
    });

    socket.on('location_update', (data) => {
      // Map coordinates projection
      const lat = data.latitude;
      const lng = data.longitude;
      setEta(data.eta || '10 mins');
      
      // Plot lat/long on our map grid (translate coordinates into map percentages)
      // Standard latitude: 12.97..., Longitude: 77.59...
      // Map range: x (20% to 90%), y (20% to 90%)
      // If we receive coordinates, let's map them or fall back to linear updates
      if (lat && lng) {
        // Map projection formulas:
        const xPercent = 30 + (lng - 77.594562) * 5000;
        const yPercent = 30 + (lat - 12.971598) * 5000;
        setRiderCoords({ 
          x: Math.min(90, Math.max(10, xPercent)), 
          y: Math.min(90, Math.max(10, yPercent)) 
        });
      }
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  // Backup Client-Side driving simulation loop if status is out_for_delivery
  useEffect(() => {
    if (orderStatus !== 'out_for_delivery') {
      if (orderStatus === 'placed' || orderStatus === 'preparing' || orderStatus === 'ready') {
        setRiderCoords(restaurantCoords);
      } else if (orderStatus === 'delivered') {
        setRiderCoords(customerCoords);
      }
      return;
    }

    let progress = 0;
    const simInterval = setInterval(() => {
      progress += 0.04; // Moves 4% every step
      if (progress >= 1) {
        progress = 1;
        clearInterval(simInterval);
      }
      
      // Linearly interpolate between restaurant and customer
      const currentX = restaurantCoords.x + (customerCoords.x - restaurantCoords.x) * progress;
      const currentY = restaurantCoords.y + (customerCoords.y - restaurantCoords.y) * progress;
      setRiderCoords({ x: currentX, y: currentY });

      // Update ETA
      const remainingTime = Math.ceil((1 - progress) * 15);
      setEta(remainingTime > 0 ? `${remainingTime} mins` : 'Arrived!');
    }, 1000);

    return () => clearInterval(simInterval);
  }, [orderStatus]);

  if (loading && !orderData) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin mx-auto"></div>
        <span className="text-xs text-stone-500 mt-2 block">Locating order route...</span>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Order Record Not Found.</h2>
        <Link to="/" className="text-orange-500 hover:underline mt-2 inline-block">Return home</Link>
      </div>
    );
  }

  const { order, restaurant, items, rider } = orderData;

  const steps = [
    { key: 'placed', label: 'Placed', desc: 'Order received' },
    { key: 'preparing', label: 'Preparing', desc: 'Kitchen dispatch' },
    { key: 'ready', label: 'Ready', desc: 'Awaiting courier' },
    { key: 'out_for_delivery', label: 'On The Way', desc: 'Rider driving' },
    { key: 'delivered', label: 'Delivered', desc: 'Meal completed' }
  ];

  const getStepIndex = (status) => {
    return steps.findIndex(s => s.key === status);
  };

  const activeIndex = getStepIndex(orderStatus);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">Track Order #{order.id}</h1>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
              socketConnected ? 'bg-green-500/10 text-green-500' : 'bg-stone-500/10 text-stone-400'
            }`}>
              {socketConnected ? 'Live Socket Sync' : 'Polling Sync'}
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-0.5">Est. Arrival: <span className="font-bold text-orange-500">{eta}</span></p>
        </div>
        <span className="px-3.5 py-1.5 rounded-full bg-orange-500 text-white text-xs font-black uppercase tracking-wider">
          Status: {orderStatus.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Step tracker and maps (2 cols) */}
        <div className="lg:col-span-2 space-y-8">
          {/* Tracker Timeline */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 shadow-sm flex justify-between items-center overflow-x-auto gap-4">
            {steps.map((step, idx) => {
              const completed = idx <= activeIndex;
              const current = idx === activeIndex;
              return (
                <div key={step.key} className="flex flex-col items-center text-center shrink-0 min-w-20 space-y-2">
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    completed
                      ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                      : 'border-stone-200 dark:border-zinc-800 text-stone-400'
                  }`}>
                    {completed ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                  </div>
                  <div>
                    <h4 className={`text-xs font-black ${current ? 'text-orange-500' : 'text-stone-700 dark:text-stone-300'}`}>{step.label}</h4>
                    <span className="text-[9px] text-stone-400 block">{step.desc}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Interactive Simulated Map */}
          <div className="rounded-[36px] overflow-hidden border border-stone-200 dark:border-zinc-800 bg-stone-100 dark:bg-zinc-900/40 relative shadow-inner">
            <div className="w-full h-80 relative map-grid">
              {/* Restaurant Icon */}
              <div 
                style={{ left: `${restaurantCoords.x}%`, top: `${restaurantCoords.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
              >
                <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-950 scale-90 hover:scale-100 transition-transform">
                  🏪
                </div>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-[8px] text-white font-bold whitespace-nowrap">{restaurant.name}</span>
              </div>

              {/* Customer Address Icon */}
              <div 
                style={{ left: `${customerCoords.x}%`, top: `${customerCoords.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
              >
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg border-2 border-white dark:border-zinc-950 scale-90 hover:scale-100 transition-transform">
                  🏠
                </div>
                <span className="px-1.5 py-0.5 rounded bg-zinc-900 text-[8px] text-white font-bold whitespace-nowrap">Home Delivery</span>
              </div>

              {/* Driving Rider Icon */}
              {(orderStatus === 'out_for_delivery' || orderStatus === 'delivered' || rider) && (
                <div 
                  style={{ left: `${riderCoords.x}%`, top: `${riderCoords.y}%` }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-20 transition-all duration-1000 ease-out"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xl border-2 border-white dark:border-zinc-950 animate-bounce">
                    <Navigation size={18} className="rotate-45" />
                  </div>
                  <span className="px-1.5 py-0.5 rounded bg-purple-600 text-[8px] text-white font-bold whitespace-nowrap">Rider (Alex)</span>
                </div>
              )}

              {/* Connecting line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <line
                  x1={`${restaurantCoords.x}%`}
                  y1={`${restaurantCoords.y}%`}
                  x2={`${customerCoords.x}%`}
                  y2={`${customerCoords.y}%`}
                  stroke="rgba(234, 88, 12, 0.15)"
                  strokeWidth="2"
                  strokeDasharray="6,6"
                />
              </svg>
            </div>
            
            {/* Map metadata banner */}
            <div className="absolute bottom-4 left-4 right-4 p-4 rounded-2xl border border-white/10 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-zinc-500 font-bold uppercase tracking-wider block">Live Delivery Map</span>
              <span className="text-xs font-black text-purple-500">Rider driving velocity: Normal</span>
            </div>
          </div>
        </div>

        {/* Order specs sidebar (1 col) */}
        <div className="space-y-6">
          {/* Rider details */}
          {rider && (
            <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-4">
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Your Delivery Partner</span>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-black text-stone-700 dark:text-stone-300 text-lg">
                  AR
                </div>
                <div>
                  <h4 className="text-sm font-black text-stone-800 dark:text-white">{rider.name || 'Alex Rider'}</h4>
                  <p className="text-[10px] text-stone-400">{rider.vehicle_number || 'E-Scooter'}</p>
                </div>
              </div>
              <a href={`tel:${rider.phone}`} className="w-full py-2.5 bg-zinc-950 dark:bg-zinc-800 hover:opacity-90 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-opacity">
                <Phone size={14} /> Call Partner
              </a>
            </div>
          )}

          {/* Receipt Summary */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Receipt summary</span>
            
            <div className="divide-y divide-stone-200 dark:divide-zinc-800/80 space-y-2.5">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs text-stone-700 dark:text-stone-300 pt-2.5">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="font-bold text-stone-850 dark:text-stone-200">${(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-stone-200 dark:border-zinc-800/85 pt-3 space-y-2 text-xs text-stone-600 dark:text-stone-400 font-bold">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Charge</span>
                <span>${Number(order.delivery_fee).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-stone-800 dark:text-white font-black">
                <span>Total Charge</span>
                <span>${Number(order.payable_amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
