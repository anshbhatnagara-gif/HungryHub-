import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, Plus, Minus, ArrowRight, CornerDownLeft } from 'lucide-react';
import { removeFromCart, updateQuantity, clearCart } from '../store/cartSlice.js';

export default function Cart() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const cartItems = useSelector((state) => state.cart.items);
  const restaurant = useSelector((state) => state.cart.restaurant);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = restaurant ? restaurant.delivery_fee : 5.00;
  const tax = Number((subtotal * 0.05).toFixed(2)); // 5% tax
  const total = subtotal + deliveryFee + tax;

  const handleQuantityChange = (itemId, newQty) => {
    if (newQty <= 0) {
      dispatch(removeFromCart(itemId));
    } else {
      dispatch(updateQuantity({ itemId, quantity: newQty }));
    }
  };

  const handleProceed = () => {
    if (!isAuthenticated) {
      navigate('/login');
    } else {
      navigate('/checkout');
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-stone-100 dark:bg-zinc-900 flex items-center justify-center mx-auto text-stone-400 dark:text-zinc-600">
          <ShoppingBag size={36} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-stone-800 dark:text-white">Your Cart is Empty</h2>
          <p className="text-xs text-stone-500 dark:text-stone-400">Add gourmet meals from our restaurants to place an order.</p>
        </div>
        <Link
          to="/restaurants"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition-all uppercase tracking-wider"
        >
          Browse Restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">Shopping Cart</h1>
        <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">
          Items from <span className="font-bold text-orange-500">{restaurant?.name}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Items List (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center text-xs text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider px-2">
            <span>Dish</span>
            <button onClick={() => dispatch(clearCart())} className="text-rose-500 hover:underline flex items-center gap-1">
              <Trash2 size={13} /> Clear All
            </button>
          </div>

          <div className="space-y-3">
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center p-4 border border-stone-200/50 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900/20 gap-4"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden shadow shrink-0">
                  <img src={item.image_url} className="w-full h-full object-cover" alt={item.name} />
                </div>

                <div className="flex-1 space-y-0.5">
                  <h4 className="text-sm sm:text-base font-extrabold text-stone-800 dark:text-white line-clamp-1">{item.name}</h4>
                  <div className="text-xs text-stone-500 dark:text-stone-400 font-black">${item.price.toFixed(2)} each</div>
                </div>

                {/* Modifiers */}
                <div className="flex items-center gap-3 bg-stone-100 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl p-1 scale-90">
                  <button onClick={() => handleQuantityChange(item.id, item.quantity - 1)} className="p-1 hover:text-orange-500 text-stone-600 dark:text-stone-400">
                    <Minus size={14} />
                  </button>
                  <span className="text-xs font-black px-1 text-stone-800 dark:text-white">{item.quantity}</span>
                  <button onClick={() => handleQuantityChange(item.id, item.quantity + 1)} className="p-1 hover:text-orange-500 text-stone-600 dark:text-stone-400">
                    <Plus size={14} />
                  </button>
                </div>

                {/* Subtotal */}
                <div className="text-sm font-black text-stone-800 dark:text-white shrink-0 min-w-16 text-right">
                  ${(item.price * item.quantity).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          <Link to="/restaurants" className="inline-flex items-center text-xs font-extrabold text-orange-500 hover:text-orange-600 uppercase tracking-widest gap-1 mt-2">
            <CornerDownLeft size={16} /> Continue Browsing
          </Link>
        </div>

        {/* Pricing Summary (1 col) */}
        <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/30 space-y-6">
          <h3 className="text-lg font-extrabold text-stone-800 dark:text-white border-b border-stone-200 dark:border-zinc-800/80 pb-4">
            Order Summary
          </h3>

          <div className="space-y-3 text-xs text-stone-600 dark:text-stone-400 font-bold">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="text-stone-850 dark:text-stone-200">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="text-stone-850 dark:text-stone-200">${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Sales Tax (5%)</span>
              <span className="text-stone-850 dark:text-stone-200">${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-black text-stone-800 dark:text-white border-t border-stone-200 dark:border-zinc-800/80 pt-4">
              <span>Total Payable</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          <button
            onClick={handleProceed}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            Checkout <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
