import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { MapPin, Wallet, CreditCard, Ticket, Check, ShieldAlert, Award } from 'lucide-react';
import { clearCart } from '../store/cartSlice.js';
import { useApi } from '../hooks/useApi.js';
import RazorpayModal from '../components/RazorpayModal.jsx';
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
  const [newAddressText, setNewAddressText] = useState('');
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
  const deliveryFee = restaurant ? restaurant.delivery_fee : 5.00;
  const tax = Number((subtotal * 0.05).toFixed(2));
  
  // Apply coupon reduction
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0.00;
  const totalPayable = Math.max(0, subtotal + deliveryFee + tax - discountAmount);

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
        }

        const profileData = await request('/api/auth/profile');
        setWalletBalance(profileData.wallet_balance || 0.00);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAddressesAndWallet();
  }, [cartItems, navigate, request]);

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!newAddressText.trim()) return;

    setAddingAddress(true);
    try {
      await request('/api/auth/addresses', {
        method: 'POST',
        body: JSON.stringify({ title: 'Saved Address', address_line: newAddressText })
      });
      const updated = await request('/api/auth/addresses');
      setAddresses(updated || []);
      setSelectedAddress(newAddressText);
      setNewAddressText('');
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
          delivery_address: selectedAddress
        })
      });

      // Confetti burst
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      // Clear cart
      dispatch(clearCart());
      
      // Redirect to tracking page
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
                      onChange={() => setSelectedAddress(addr.address_line)}
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
              <p className="text-xs text-stone-400">No addresses saved. Please enter a delivery location below.</p>
            )}

            {/* Save new address form */}
            <form onSubmit={handleAddAddress} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter address line (e.g. 100 Main St)..."
                value={newAddressText}
                onChange={(e) => setNewAddressText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white"
              />
              <button
                type="submit"
                disabled={addingAddress}
                className="px-4 py-2.5 bg-zinc-950 dark:bg-zinc-800 hover:opacity-90 text-white font-extrabold text-xs rounded-xl transition-all whitespace-nowrap"
              >
                Add
              </button>
            </form>
          </div>

          {/* Payment Method Selector */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <h3 className="text-lg font-extrabold text-stone-850 dark:text-white flex items-center gap-2">
              <Wallet className="text-orange-500" size={18} /> Payment Options
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Wallet */}
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

              {/* Razorpay */}
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

              {/* COD */}
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
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs uppercase focus:outline-none"
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
              <div className="flex justify-between">
                <span>Delivery Charges</span>
                <span className="text-stone-800 dark:text-stone-200">${deliveryFee.toFixed(2)}</span>
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
              disabled={placingOrder}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
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
