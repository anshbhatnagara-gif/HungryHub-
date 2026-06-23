import React, { useState } from 'react';
import { CreditCard, ShieldCheck, X } from 'lucide-react';

export default function RazorpayModal({ isOpen, onClose, amount, onPaymentSuccess, onPaymentFailure }) {
  const [cardNumber, setCardNumber] = useState('4111 1111 1111 1111');
  const [expiry, setExpiry] = useState('12/28');
  const [cvv, setCvv] = useState('123');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSimulateSuccess = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const fakePaymentId = 'pay_hh_' + Math.random().toString(36).substr(2, 9);
      onPaymentSuccess(fakePaymentId);
    }, 1500);
  };

  const handleSimulateFailure = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onPaymentFailure('Sandbox payment rejected by card network.');
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-zinc-800 text-white shadow-2xl p-6 relative overflow-hidden">
        {/* Close */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-900 text-zinc-500 hover:text-white"
        >
          <X size={18} />
        </button>

        {/* Razorpay Brand Header */}
        <div className="flex items-center space-x-2 border-b border-zinc-900 pb-4 mb-6">
          <span className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold text-white tracking-tighter text-sm">
            R
          </span>
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">Razorpay Checkout</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Test Sandbox Mode</p>
          </div>
        </div>

        {/* Payment Summary */}
        <div className="rounded-2xl bg-zinc-900 p-4 mb-6 text-center border border-zinc-800">
          <span className="text-xs text-zinc-500">Merchant Payout</span>
          <h2 className="text-2xl font-black text-blue-400 mt-1">HungryHub SaaS</h2>
          <div className="text-3xl font-black tracking-tight text-white mt-2">${amount.toFixed(2)}</div>
        </div>

        {/* Mock Form Fields */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Card Number</label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={cardNumber}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none text-zinc-400 font-mono"
              />
              <CreditCard className="absolute right-3.5 top-3 text-zinc-600" size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">Expiry Date</label>
              <input
                type="text"
                disabled
                value={expiry}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none text-zinc-400 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">CVV</label>
              <input
                type="text"
                disabled
                value={cvv}
                className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none text-zinc-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-2">
            <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
            <span className="text-xs text-zinc-500">Contacting issuer network...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={handleSimulateSuccess}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-1.5"
            >
              <ShieldCheck size={16} /> Simulate Charge Success
            </button>
            <button
              onClick={handleSimulateFailure}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white font-semibold text-xs rounded-xl transition-all"
            >
              Simulate Network Error
            </button>
          </div>
        )}

        <div className="flex justify-center items-center gap-1.5 mt-6 text-[10px] text-zinc-600 font-medium uppercase tracking-wider">
          <ShieldCheck size={12} className="text-green-500" /> Secure 256-bit SSL Sandbox
        </div>
      </div>
    </div>
  );
}
