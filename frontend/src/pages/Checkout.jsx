import React, { useState, useEffect, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { MapPin, Wallet, CreditCard, Ticket, ShieldAlert, Award, Compass, Search } from 'lucide-react';
import { clearCart } from '../store/cartSlice.js';
import { useApi } from '../hooks/useApi.js';
import RazorpayModal from '../components/RazorpayModal.jsx';
import MapComponent from '../components/MapComponent.jsx';
import confetti from 'canvas-confetti';

export default function Checkout() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { request } = useApi();
  const { user } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const restaurant = useSelector((state) => state.cart.restaurant);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [selectedCoords, setSelectedCoords] = useState(null);

  // Address check states
  const [inZone, setInZone] = useState(true);
  const [zoneMessage, setZoneMessage] = useState('');
  const [distanceKm, setDistanceKm] = useState(0);
  const [eta, setEta] = useState('');
  const [dynamicDeliveryFee, setDynamicDeliveryFee] = useState(5.00);
  const [validationLoading, setValidationLoading] = useState(false);

  // New Address / Autocomplete state
  const [newAddressText, setNewAddressText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [tempCoords, setTempCoords] = useState(null);
  const [tempInZone, setTempInZone] = useState(true);
  const [tempZoneMessage, setTempZoneMessage] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);

  // Wallet
  const [walletBalance, setWalletBalance] = useState(0.00);

  // Coupon
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState('wallet');
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  // Order placing states
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = dynamicDeliveryFee;
  const tax = Number((subtotal * 0.05).toFixed(2));
  
  // Apply coupon reduction
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0.00;
  const totalPayable = Math.max(0, subtotal + deliveryFee + tax - discountAmount);

  // Check if system is in dark mode
  const currentTheme = document.body.classList.contains('dark') ? 'dark' : 'light';

  // Parse restaurant delivery polygon
  const restaurantPolygon = useMemo(() => {
    if (!restaurant || !restaurant.delivery_zone) return null;
    try {
      const parsed = JSON.parse(restaurant.delivery_zone);
      if (Array.isArray(parsed)) {
        return parsed.map(point => {
          if (Array.isArray(point)) return { lat: point[0], lng: point[1] };
          return point;
        });
      }
    } catch (e) {
      console.error("Error parsing delivery zone polygon", e);
    }
    return null;
  }, [restaurant]);

  useEffect(() => {
    if (cartItems.length === 0) {
      navigate('/cart');
      return;
    }

    const fetchAddressesAndWallet = async () => {
      try {
        const addrData = await request('/api/auth/addresses');
        setAddresses(addrData || []);
        if (addrData && addrData.length > 0) {
          setSelectedAddress(addrData[0].address_line);
          setSelectedCoords({ 
            lat: parseFloat(addrData[0].latitude) || 12.9724, 
            lng: parseFloat(addrData[0].longitude) || 77.5906 
          });
        }

        const profileData = await request('/api/auth/profile');
        setWalletBalance(profileData.wallet_balance || 0.00);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAddressesAndWallet();
  }, [cartItems, navigate, request]);

  // Autocomplete Suggestions fetch
  useEffect(() => {
    if (!newAddressText.trim() || newAddressText.length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        const res = await request('/api/maps/autocomplete', {
          method: 'POST',
          body: JSON.stringify({ input: newAddressText })
        });
        setSuggestions(res.suggestions || []);
      } catch (e) {
        console.error(e);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [newAddressText, request]);

  // Dynamic validator & delivery directions calculation
  useEffect(() => {
    if (!selectedCoords || !restaurant) return;

    const validateAndCalculate = async () => {
      setValidationLoading(true);
      try {
        // Validate custom coordinates are inside delivery polygon
        const valRes = await request('/api/maps/zones/validate', {
          method: 'POST',
          body: JSON.stringify({
            restaurant_id: restaurant.id,
            latitude: selectedCoords.lat,
            longitude: selectedCoords.lng
          })
        });

        setInZone(valRes.inZone);
        setZoneMessage(valRes.message);

        // Fetch routing metrics (OSRM/Google)
        const dirRes = await request(
          `/api/maps/directions?originLat=${restaurant.latitude}&originLng=${restaurant.longitude}&destLat=${selectedCoords.lat}&destLng=${selectedCoords.lng}`
        );

        if (dirRes) {
          const distMeters = dirRes.distanceValue || 3500;
          const distKm = distMeters / 1000;
          setDistanceKm(parseFloat(distKm.toFixed(1)));
          setEta(dirRes.duration || '15 mins');

          // Dynamic delivery fee calculation: $2.00 base + $1.00 per kilometer
          const computedFee = 2.00 + distKm * 1.00;
          setDynamicDeliveryFee(Number(computedFee.toFixed(2)));
        }
      } catch (err) {
        console.error('Zone validation/directions error:', err);
      } finally {
        setValidationLoading(false);
      }
    };

    validateAndCalculate();
  }, [selectedCoords, restaurant, request]);

  const handleSelectSuggestion = async (suggestion) => {
    setNewAddressText(suggestion.description);
    setSuggestions([]);
    try {
      const geo = await request('/api/maps/geocode', {
        method: 'POST',
        body: JSON.stringify({ address: suggestion.description })
      });
      
      if (geo && geo.latitude && geo.longitude) {
        setTempCoords({ lat: geo.latitude, lng: geo.longitude });

        // Validate polygon zone
        const valRes = await request('/api/maps/zones/validate', {
          method: 'POST',
          body: JSON.stringify({
            restaurant_id: restaurant.id,
            latitude: geo.latitude,
            longitude: geo.longitude
          })
        });
        setTempInZone(valRes.inZone);
        setTempZoneMessage(valRes.message);
      }
    } catch (err) {
      console.error('Error selecting suggestion:', err);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      const { latitude, longitude } = position.coords;
      setTempCoords({ lat: latitude, lng: longitude });
      
      try {
        let address = `Location [${latitude.toFixed(4)}, ${longitude.toFixed(4)}]`;
        
        // Reverse Geocode fallback
        const osmRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`, {
          headers: { 'User-Agent': 'HungryHub-App/1.0' }
        });
        const data = await osmRes.json();
        if (data && data.display_name) {
          address = data.display_name;
        }

        setNewAddressText(address);
        
        // Validate polygon zone
        const valRes = await request('/api/maps/zones/validate', {
          method: 'POST',
          body: JSON.stringify({ restaurant_id: restaurant.id, latitude, longitude })
        });
        setTempInZone(valRes.inZone);
        setTempZoneMessage(valRes.message);
      } catch (err) {
        console.error(err);
      }
    }, (err) => {
      alert("Failed to retrieve location: " + err.message);
    });
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressText.trim()) return;

    if (tempCoords && !tempInZone) {
      setOrderError('Cannot add address: ' + tempZoneMessage);
      return;
    }

    setAddingAddress(true);
    try {
      await request('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({ 
          title: 'Saved Location', 
          address_line: newAddressText,
          latitude: tempCoords ? tempCoords.lat : undefined,
          longitude: tempCoords ? tempCoords.lng : undefined
        })
      });
      
      const updated = await request('/api/auth/addresses');
      setAddresses(updated || []);
      
      setSelectedAddress(newAddressText);
      if (tempCoords) {
        setSelectedCoords(tempCoords);
      }
      setNewAddressText('');
      setTempCoords(null);
      setTempZoneMessage('');
      setOrderError('');
    } catch (err) {
      console.error(err);
    } finally {
      setAddingAddress(false);
    }
  };

  const handleValidateCoupon = async (e) => {
    e.preventDefault();
    setCouponError('');
    try {
      const data = await request('/api/orders/coupon/validate', {
        method: 'POST',
        body: JSON.stringify({ code: couponCodeInput, amount: subtotal })
      });

      if (data.isValid) {
        setAppliedCoupon({ code: data.code, discount: data.discount });
        setCouponCodeInput('');
      }
    } catch (err) {
      setCouponError(err.message);
    }
  };

  const executeOrderCheckout = async (paymentId = null) => {
    setPlacingOrder(true);
    setOrderError('');
    try {
      const data = await request('/api/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({
          restaurant_id: restaurant.id,
          items: cartItems,
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          discount_amount: discountAmount,
          payable_amount: totalPayable,
          payment_method: paymentMethod,
          payment_id: paymentId,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          delivery_address: selectedAddress,
          latitude: selectedCoords ? selectedCoords.lat : null,
          longitude: selectedCoords ? selectedCoords.lng : null
        })
      });

      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      dispatch(clearCart());
      navigate(`/orders/tracking?id=${data.orderId}`);
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handlePlaceOrder = () => {
    if (!selectedAddress) {
      setOrderError('Please select or add a delivery address.');
      return;
    }

    if (!inZone) {
      setOrderError('Address is outside the restaurant delivery boundary. Order blocked.');
      return;
    }

    if (paymentMethod === 'wallet' && walletBalance < totalPayable) {
      setOrderError('Insufficient wallet balance. Please add funds on the Wallet page.');
      return;
    }

    if (paymentMethod === 'razorpay') {
      setIsRazorpayOpen(true);
    } else {
      executeOrderCheckout();
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">Checkout Securely</h1>
        <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Review items and choose your payment method</p>
      </div>

      {orderError && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl text-xs flex gap-2">
          <ShieldAlert size={16} className="shrink-0 mt-0.5" />
          <span>{orderError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Columns (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Address Card */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <h3 className="text-lg font-extrabold text-stone-850 dark:text-white flex items-center gap-2">
              <MapPin className="text-orange-500" size={18} /> Delivery Address
            </h3>

            {addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start p-3.5 border rounded-2xl cursor-pointer transition-all gap-3 ${
                      selectedAddress === addr.address_line
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddress === addr.address_line}
                      onChange={() => {
                        setSelectedAddress(addr.address_line);
                        setSelectedCoords({ 
                          lat: parseFloat(addr.latitude), 
                          lng: parseFloat(addr.longitude) 
                        });
                      }}
                      className="mt-1 accent-orange-500"
                    />
                    <div className="space-y-0.5">
                      <span className="text-xs font-black uppercase tracking-wider text-orange-500">{addr.title}</span>
                      <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-medium">{addr.address_line}</p>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400">No addresses saved. Please search for a location below.</p>
            )}

            {/* Address Verification Status Banner */}
            {selectedCoords && (
              <div className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:justify-between gap-2 ${
                inZone 
                  ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
              }`}>
                <div>
                  <span className="font-extrabold uppercase tracking-wide block text-[10px]">Delivery Check</span>
                  <p className="font-medium mt-0.5">{zoneMessage}</p>
                </div>
                {inZone && (
                  <div className="text-[10px] uppercase font-black tracking-widest text-right shrink-0 mt-1">
                    ETA: {eta} | {distanceKm} km away
                  </div>
                )}
              </div>
            )}

            {/* Mini-Map Preview */}
            {selectedCoords && restaurant && (
              <div className="rounded-2xl overflow-hidden border border-stone-200 dark:border-zinc-800">
                <MapComponent
                  center={selectedCoords}
                  zoom={12}
                  polygon={restaurantPolygon}
                  theme={currentTheme}
                  markers={[
                    { lat: restaurant.latitude, lng: restaurant.longitude, iconUrl: 'https://cdn-icons-png.flaticon.com/512/3180/3180136.png' },
                    { lat: selectedCoords.lat, lng: selectedCoords.lng, iconUrl: 'https://cdn-icons-png.flaticon.com/512/2952/2952321.png' }
                  ]}
                  height="200px"
                />
              </div>
            )}

            {/* Autocomplete search address form */}
            <form onSubmit={handleAddAddress} className="space-y-3 relative">
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Add New Delivery Location</span>
              <div className="flex gap-2">
                <div className="relative flex-1 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl p-1.5 flex items-center shadow-inner">
                  <Search size={16} className="text-stone-400 ml-2" />
                  <input
                    type="text"
                    placeholder="Search address (e.g. Richmond Town)..."
                    value={newAddressText}
                    onChange={(e) => setNewAddressText(e.target.value)}
                    className="w-full px-2 py-1 bg-transparent text-xs text-stone-850 dark:text-white border-none focus:outline-none"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={handleLocateMe}
                  className="p-2.5 bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 text-orange-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                  title="Locate Me"
                >
                  <Compass size={18} />
                </button>

                <button
                  type="submit"
                  disabled={addingAddress || !newAddressText.trim()}
                  className="px-4 py-2.5 bg-zinc-950 dark:bg-zinc-800 hover:opacity-90 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl transition-all whitespace-nowrap"
                >
                  Confirm & Add
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 rounded-2xl shadow-xl z-[9999] overflow-hidden max-h-60 overflow-y-auto">
                  {suggestions.map((s, idx) => (
                    <button
                      key={s.place_id || idx}
                      type="button"
                      onClick={() => handleSelectSuggestion(s)}
                      className="w-full text-left px-4 py-3 hover:bg-stone-50 dark:hover:bg-zinc-800/80 text-xs font-medium text-stone-700 dark:text-stone-300 border-b border-stone-100 dark:border-zinc-900 last:border-0 block transition-colors"
                    >
                      {s.description}
                    </button>
                  ))}
                </div>
              )}

              {/* Map Preview for new searched coordinates */}
              {tempCoords && (
                <div className="p-3 border border-orange-500/20 bg-orange-500/5 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-extrabold text-orange-500">Searched Address Map Preview</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      tempInZone ? 'bg-green-500/10 text-green-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {tempInZone ? 'Deliverable' : 'Out of Boundary'}
                    </span>
                  </div>
                  {!tempInZone && (
                    <p className="text-[10px] text-rose-500 font-bold">{tempZoneMessage}</p>
                  )}
                  <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-zinc-850">
                    <MapComponent
                      center={tempCoords}
                      zoom={12}
                      polygon={restaurantPolygon}
                      theme={currentTheme}
                      markers={[
                        { lat: restaurant.latitude, lng: restaurant.longitude, iconUrl: 'https://cdn-icons-png.flaticon.com/512/3180/3180136.png' },
                        { lat: tempCoords.lat, lng: tempCoords.lng, iconUrl: 'https://cdn-icons-png.flaticon.com/512/2952/2952321.png' }
                      ]}
                      height="150px"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Payment Method Selector */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <h3 className="text-lg font-extrabold text-stone-855 dark:text-white flex items-center gap-2">
              <Wallet className="text-orange-500" size={18} /> Payment Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`flex flex-col p-4 border rounded-2xl text-left gap-2 transition-all hover:scale-[1.01] ${
                  paymentMethod === 'wallet'
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900'
                }`}
              >
                <Wallet className="text-orange-500" size={20} />
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-stone-800 dark:text-white">HungryHub Wallet</h4>
                  <p className="text-[10px] text-stone-400 mt-0.5">Bal: ${walletBalance.toFixed(2)}</p>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('razorpay')}
                className={`flex flex-col p-4 border rounded-2xl text-left gap-2 transition-all hover:scale-[1.01] ${
                  paymentMethod === 'razorpay'
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900'
                }`}
              >
                <CreditCard className="text-blue-500" size={20} />
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-stone-800 dark:text-white">Cards / UPI</h4>
                  <p className="text-[10px] text-stone-400 mt-0.5">Secured with Razorpay</p>
                </div>
              </button>

              <button
                onClick={() => setPaymentMethod('cod')}
                className={`flex flex-col p-4 border rounded-2xl text-left gap-2 transition-all hover:scale-[1.01] ${
                  paymentMethod === 'cod'
                    ? 'border-orange-500 bg-orange-500/5'
                    : 'border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900'
                }`}
              >
                <MapPin className="text-green-500" size={20} />
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-stone-800 dark:text-white">Cash on Delivery</h4>
                  <p className="text-[10px] text-stone-400 mt-0.5">Pay rider at door</p>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing & Checkout Summary (1 col) */}
        <div className="space-y-6">
          {/* Coupon apply box */}
          <div className="p-4 rounded-2xl border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-2">Apply Promo Code</span>
            
            {appliedCoupon ? (
              <div className="flex items-center justify-between p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold">
                <span className="flex items-center gap-1.5"><Ticket size={14} /> {appliedCoupon.code} Applied</span>
                <button onClick={() => setAppliedCoupon(null)} className="hover:underline text-[10px]">Remove</button>
              </div>
            ) : (
              <form onSubmit={handleValidateCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. HUNGRY50"
                  value={couponCodeInput}
                  onChange={(e) => setCouponCodeInput(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs uppercase focus:outline-none focus:ring-0"
                />
                <button type="submit" className="px-3.5 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl transition-all">
                  Apply
                </button>
              </form>
            )}

            {couponError && (
              <span className="text-[10px] text-rose-500 mt-1 block">{couponError}</span>
            )}
          </div>

          {/* Detailed Pricing */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-6">
            <h3 className="text-lg font-extrabold text-stone-800 dark:text-white border-b border-stone-200 dark:border-zinc-800/80 pb-4">Checkout Specs</h3>

            <div className="space-y-3 text-xs text-stone-600 dark:text-stone-400 font-bold">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-stone-800 dark:text-stone-200">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Delivery Charges</span>
                <span className="text-stone-800 dark:text-stone-200 flex items-center gap-1">
                  {validationLoading ? (
                    <span className="w-3 h-3 rounded-full border border-orange-500 border-t-transparent animate-spin block"></span>
                  ) : (
                    `$${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span>GST Tax (5%)</span>
                <span className="text-stone-800 dark:text-stone-200">${tax.toFixed(2)}</span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-orange-500 font-black">
                  <span>Coupon Discount</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-stone-800 dark:text-white border-t border-stone-200 dark:border-zinc-800/80 pt-4">
                <span>Payable Amount</span>
                <span>${totalPayable.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={placingOrder || !inZone || validationLoading}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {placingOrder ? 'Processing Checkout...' : 'Confirm Order'}
            </button>
          </div>
        </div>
      </div>

      {/* Razorpay Simulation Sandbox modal overlay */}
      <RazorpayModal
        isOpen={isRazorpayOpen}
        onClose={() => setIsRazorpayOpen(false)}
        amount={totalPayable}
        onPaymentSuccess={(fakePaymentId) => {
          setIsRazorpayOpen(false);
          executeOrderCheckout(fakePaymentId);
        }}
        onPaymentFailure={(err) => {
          setIsRazorpayOpen(false);
          setOrderError(err);
        }}
      />
    </div>
  );
}
