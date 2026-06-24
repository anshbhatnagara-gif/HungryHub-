import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { Navigation, Bike, Power, ClipboardList, Wallet, MapPin, CheckCircle2, Award, Route } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';
import MapComponent from '../components/MapComponent.jsx';

// Helper: Haversine distance (in km)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

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

  // Location Simulation & Tracking
  const [drivingSim, setDrivingSim] = useState(false);
  const [trackingMode, setTrackingMode] = useState('simulated'); // 'simulated' | 'real_gps'
  const [driveProgress, setDriveProgress] = useState(0);
  const [eta, setEta] = useState('15 mins');
  const [riderCoords, setRiderCoords] = useState(null);
  const [route, setRoute] = useState(null);

  const socketRef = useRef(null);
  const simIntervalRef = useRef(null);
  const watchIdRef = useRef(null);

  const loadRouteDirections = async (order) => {
    if (!order) return;
    const restLat = Number(order.restaurant_latitude || 12.9730);
    const restLng = Number(order.restaurant_longitude || 77.5960);
    const custLat = Number(order.latitude || 12.9724);
    const custLng = Number(order.longitude || 77.5906);
    try {
      const data = await request(`/api/maps/directions?originLat=${restLat}&originLng=${restLng}&destLat=${custLat}&destLng=${custLng}`);
      if (data && data.route) {
        setRoute(data.route);
      }
    } catch (err) {
      console.warn('Failed to load directions route:', err);
    }
  };

  const fetchRiderData = async () => {
    try {
      const data = await request('/api/orders/rider/earnings');
      setRider(data.rider);
      setIsOnline(data.rider.status === 'online');
      setDeliveriesHistory(data.deliveries || []);

      const avail = await request('/api/orders/rider/available');
      setAvailableOrders(avail || []);

      if (data.activeOrder) {
        setActiveOrder(data.activeOrder);
        setActiveTab('active');
        loadRouteDirections(data.activeOrder);
        if (data.activeOrder.route_history && data.activeOrder.route_history.length > 0) {
          const lastPoint = data.activeOrder.route_history[data.activeOrder.route_history.length - 1];
          setRiderCoords({ lat: Number(lastPoint.latitude), lng: Number(lastPoint.longitude) });
        } else {
          setRiderCoords({
            lat: Number(data.activeOrder.restaurant_latitude || 12.9730),
            lng: Number(data.activeOrder.restaurant_longitude || 77.5960)
          });
        }
      } else {
        setActiveOrder(null);
        setRiderCoords(null);
        setRoute(null);
      }
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
  }, [user, navigate]);

  // Connect socket connection
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    
    socket.emit('join_role', 'rider');
    return () => {
      socket.disconnect();
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
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
      setRiderCoords({
        lat: Number(order.restaurant_latitude || 12.9730),
        lng: Number(order.restaurant_longitude || 77.5960)
      });
      loadRouteDirections(order);
      fetchRiderData();
    } catch (err) {
      alert(err.message);
    }
  };

  const stopTracking = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setDrivingSim(false);
  };

  const handleStartGPS = async () => {
    if (drivingSim) return;

    const restLat = Number(activeOrder.restaurant_latitude || 12.9730);
    const restLng = Number(activeOrder.restaurant_longitude || 77.5960);
    const custLat = Number(activeOrder.latitude || 12.9724);
    const custLng = Number(activeOrder.longitude || 77.5906);

    if (trackingMode === 'real_gps') {
      if (!navigator.geolocation) {
        alert('Geolocation is not supported by your browser.');
        return;
      }
      stopTracking();
      setDrivingSim(true);
      setDriveProgress(0);

      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, heading } = position.coords;
          setRiderCoords({ lat: latitude, lng: longitude });

          // Calculate ETA
          const distance = calculateDistance(latitude, longitude, custLat, custLng);
          const currentETA = Math.ceil(distance * 3); // 3 mins per km
          setEta(currentETA > 0 ? `${currentETA} mins` : 'Arrived!');

          // Calculate progress percent based on distance from rest to cust
          const totalDistance = calculateDistance(restLat, restLng, custLat, custLng);
          const remainingDistance = calculateDistance(latitude, longitude, custLat, custLng);
          let progress = Math.round(((totalDistance - remainingDistance) / totalDistance) * 100);
          if (progress < 0) progress = 0;
          if (progress > 100) progress = 100;
          setDriveProgress(progress);

          // Emit location over socket
          socketRef.current.emit('update_location', {
            orderId: activeOrder.id,
            latitude,
            longitude,
            heading: heading || 0,
            eta: currentETA > 0 ? `${currentETA} mins` : 'Arrived!'
          });
        },
        (err) => {
          console.error('Error watchPosition:', err);
          alert(`Failed to acquire real GPS location: ${err.message}. Switching to simulation.`);
          setTrackingMode('simulated');
          setDrivingSim(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      // Simulated mode - fetch actual directions route!
      stopTracking();
      setDrivingSim(true);
      setDriveProgress(0);

      let routePoints = [];
      try {
        const directions = await request(`/api/maps/directions?originLat=${restLat}&originLng=${restLng}&destLat=${custLat}&destLng=${custLng}`);
        if (directions && directions.route && directions.route.length > 0) {
          routePoints = directions.route;
        }
      } catch (err) {
        console.warn('Failed to fetch directions for simulator:', err);
      }

      // Fallback if no directions route returned
      if (routePoints.length === 0) {
        // Generate linear interpolation points
        const steps = 15;
        for (let i = 0; i <= steps; i++) {
          const ratio = i / steps;
          routePoints.push({
            lat: restLat + (custLat - restLat) * ratio,
            lng: restLng + (custLng - restLng) * ratio
          });
        }
      }

      let currentIndex = 0;
      const totalPoints = routePoints.length;

      // Update location immediately at starting point
      const startPoint = routePoints[0];
      setRiderCoords({ lat: startPoint.lat, lng: startPoint.lng });

      simIntervalRef.current = setInterval(() => {
        currentIndex++;
        if (currentIndex >= totalPoints) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
          setDrivingSim(false);
          setDriveProgress(100);
          setEta('Arrived!');
          return;
        }

        const point = routePoints[currentIndex];
        const currentLat = point.lat;
        const currentLng = point.lng;
        const progress = Math.round((currentIndex / (totalPoints - 1)) * 100);

        setDriveProgress(progress);
        setRiderCoords({ lat: currentLat, lng: currentLng });

        // Calculate heading
        let heading = 0;
        if (currentIndex > 0) {
          const prev = routePoints[currentIndex - 1];
          const dy = currentLat - prev.lat;
          const dx = currentLng - prev.lng;
          heading = Math.round(Math.atan2(dx, dy) * (180 / Math.PI));
        }

        const currentETA = Math.ceil(((totalPoints - 1 - currentIndex) / (totalPoints - 1)) * 15);
        setEta(currentETA > 0 ? `${currentETA} mins` : 'Arrived!');

        // Emit socket updates
        socketRef.current.emit('update_location', {
          orderId: activeOrder.id,
          latitude: currentLat,
          longitude: currentLng,
          heading,
          eta: currentETA > 0 ? `${currentETA} mins` : 'Arrived!'
        });
      }, 1500); // update every 1.5 seconds
    }
  };

  const handleStartStopTracking = () => {
    if (drivingSim) {
      stopTracking();
      return;
    }
    handleStartGPS();
  };

  const handleCompleteDelivery = async () => {
    try {
      stopTracking();
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
      setRiderCoords(null);
      setRoute(null);
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

  // Define actual coordinates for map rendering
  const rLat = activeOrder ? Number(activeOrder.restaurant_latitude || 12.9730) : 12.9730;
  const rLng = activeOrder ? Number(activeOrder.restaurant_longitude || 77.5960) : 77.5960;
  const cLat = activeOrder ? Number(activeOrder.latitude || 12.9724) : 12.9724;
  const cLng = activeOrder ? Number(activeOrder.longitude || 77.5906) : 77.5906;

  const markers = activeOrder ? [
    { lat: rLat, lng: rLng, iconUrl: 'https://cdn-icons-png.flaticon.com/512/3180/3180136.png' },
    { lat: cLat, lng: cLng, iconUrl: 'https://cdn-icons-png.flaticon.com/512/2952/2952321.png' },
    ...(riderCoords ? [{ lat: riderCoords.lat, lng: riderCoords.lng, iconUrl: 'https://cdn-icons-png.flaticon.com/512/3034/3034947.png' }] : [])
  ] : [];

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
            <div className="text-center py-10 text-xs text-stone-500 font-bold">You must toggle online status to view available food deliveries.</div>
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
            <p className="text-center py-10 text-xs text-stone-400 font-bold">No pending orders ready for pickup. Waiting for restaurants...</p>
          )}
        </div>
      )}

      {activeTab === 'active' && activeOrder && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Active Job Map navigation (2 cols) */}
          <div className="md:col-span-2 p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
            <h3 className="text-base font-extrabold text-stone-850 dark:text-white flex items-center gap-2">
              <Navigation className="text-orange-500" size={18} /> GPS Route Navigation
            </h3>

            {/* GPS driving simulation visual */}
            <div className="rounded-2xl bg-zinc-950 border border-zinc-900 p-4 space-y-4 relative">
              <div className="flex justify-between items-center text-xs px-2">
                <span className="text-zinc-500 font-bold">Route Progress</span>
                <span className="text-purple-400 font-black">{driveProgress}% Completed</span>
              </div>
              
              <div className="w-full h-72 rounded-xl overflow-hidden relative">
                <MapComponent
                  center={riderCoords || { lat: rLat, lng: rLng }}
                  zoom={14}
                  markers={markers}
                  route={route}
                  height="100%"
                  theme="dark"
                />
              </div>

              <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider px-2">
                <span className="truncate max-w-[45%]">{activeOrder.restaurant_name}</span>
                <span className="truncate max-w-[45%]">Customer Destination</span>
              </div>
            </div>

            {/* Action buttons & mode toggle */}
            <div className="flex flex-col gap-4 border-t border-stone-100 dark:border-zinc-900 pt-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-stone-500 dark:text-stone-400">Tracking Mode:</span>
                  <span className="text-xs font-black text-orange-500 uppercase">{trackingMode.replace('_', ' ')}</span>
                </div>
                <div className="flex bg-stone-100 dark:bg-zinc-900 p-1 rounded-xl border border-stone-250 dark:border-zinc-800 w-fit">
                  <button
                    onClick={() => {
                      if (drivingSim) return;
                      setTrackingMode('simulated');
                    }}
                    disabled={drivingSim}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      trackingMode === 'simulated' ? 'bg-orange-500 text-white shadow' : 'text-stone-600 dark:text-stone-400 disabled:opacity-50'
                    }`}
                  >
                    Simulate driving
                  </button>
                  <button
                    onClick={() => {
                      if (drivingSim) return;
                      setTrackingMode('real_gps');
                    }}
                    disabled={drivingSim}
                    className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all ${
                      trackingMode === 'real_gps' ? 'bg-orange-500 text-white shadow' : 'text-stone-600 dark:text-stone-400 disabled:opacity-50'
                    }`}
                  >
                    Real Device GPS
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {driveProgress < 100 ? (
                  <button
                    onClick={handleStartStopTracking}
                    className={`px-5 py-2.5 text-white font-extrabold text-xs rounded-xl flex items-center gap-1 shadow-lg transition-all ${
                      drivingSim
                        ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/25'
                        : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/25'
                    }`}
                  >
                    <Route size={14} /> 
                    {drivingSim 
                      ? (trackingMode === 'real_gps' ? 'Stop GPS Tracking' : 'Simulating Transit...') 
                      : (trackingMode === 'real_gps' ? 'Start GPS Watch' : 'Start Driving Simulation')
                    }
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
          </div>

          {/* Active Job Info Details (1 col) */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-4 text-xs text-stone-600 dark:text-stone-400 font-bold">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block font-sans">Job Details</span>
            
            <div className="space-y-1">
              <span className="text-stone-850 dark:text-stone-200 block text-sm font-black">Order ID: #{activeOrder.id}</span>
              <p>ETA to destination: <span className="text-orange-500 font-black">{eta}</span></p>
            </div>

            <div className="border-t border-stone-200 dark:border-zinc-850 pt-3 space-y-3 font-sans">
              <div>
                <span className="text-[9px] uppercase text-stone-400 dark:text-zinc-500 block font-black">Pickup Restaurant</span>
                <span className="text-stone-850 dark:text-stone-200 font-extrabold block mt-0.5">{activeOrder.restaurant_name}</span>
                <span className="text-[10px] text-stone-400 block font-normal mt-0.5">{activeOrder.restaurant_address}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase text-stone-400 dark:text-zinc-500 block font-black">Customer Address</span>
                <span className="text-stone-850 dark:text-stone-200 font-extrabold block mt-0.5">{activeOrder.delivery_address}</span>
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
                <div className="text-center py-10 text-xs text-stone-400 font-bold">No completed orders records. Accept available pickups to start earning.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
