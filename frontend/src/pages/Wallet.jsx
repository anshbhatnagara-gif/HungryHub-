import React, { useState, useEffect } from 'react';
import { Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownRight, Award, ShieldCheck } from 'lucide-react';
import { useApi } from '../hooks/useApi.js';

export default function Wallet() {
  const { request, loading } = useApi();
  const [balance, setBalance] = useState(0.00);
  const [transactions, setTransactions] = useState([]);
  const [addAmount, setAddAmount] = useState('');
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState('');

  const fetchWallet = async () => {
    try {
      const data = await request('/api/auth/wallet');
      setBalance(data.balance);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, [request]);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) return;

    setAdding(true);
    setMessage('');
    try {
      await request('/api/auth/wallet/add', {
        method: 'POST',
        body: JSON.stringify({ amount: Number(addAmount) })
      });
      setAddAmount('');
      setMessage('Funds loaded successfully! Your wallet balance has updated.');
      fetchWallet();
    } catch (err) {
      console.error(err);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">Digital Wallet</h1>
        <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Manage your funds and audit transactions securely</p>
      </div>

      {message && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl text-xs flex gap-2">
          <ShieldCheck size={16} className="shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Wallet Balance widget (1 col) */}
        <div className="space-y-6">
          <div className="p-6 rounded-[32px] bg-gradient-to-br from-amber-500 via-orange-500 to-rose-600 text-white shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-15 w-44 h-44 rounded-full bg-white/20 blur-2xl"></div>
            <span className="text-[10px] text-amber-200 font-extrabold uppercase tracking-widest block">Available Funds</span>
            <div className="text-4xl font-black tracking-tight mt-2">${Number(balance).toFixed(2)}</div>
            
            <div className="mt-8 flex justify-between items-center text-[10px] uppercase font-bold text-amber-100 tracking-wider">
              <span>HungryHub Premium Card</span>
              <span>Active</span>
            </div>
          </div>

          {/* Add Funds Box */}
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-4">
            <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Deposit Funds</span>
            
            <form onSubmit={handleAddFunds} className="space-y-3">
              <div className="relative bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl p-1 flex items-center">
                <span className="text-stone-400 dark:text-zinc-600 font-black px-2.5 text-sm">$</span>
                <input
                  type="number"
                  placeholder="Amount"
                  value={addAmount}
                  onChange={(e) => setAddAmount(e.target.value)}
                  className="w-full py-2 bg-transparent text-sm text-stone-850 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[20, 50, 100].map(amt => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAddAmount(String(amt))}
                    className="py-1.5 border border-stone-200 dark:border-zinc-800 text-[10px] font-bold rounded-lg text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    +${amt}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={adding || loading}
                className="w-full py-2.5 bg-zinc-950 dark:bg-zinc-800 text-white hover:opacity-90 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1 transition-opacity"
              >
                <Plus size={14} /> {adding ? 'Loading funds...' : 'Add Balance'}
              </button>
            </form>
          </div>
        </div>

        {/* Transactions Ledger (2 cols) */}
        <div className="md:col-span-2 p-6 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 space-y-6">
          <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Transaction logs</span>
          
          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            {transactions.length > 0 ? (
              transactions.map((tx) => {
                const isCredit = tx.type === 'credit';
                return (
                  <div
                    key={tx.id}
                    className="flex justify-between items-center p-3.5 border border-stone-200/50 dark:border-zinc-900 rounded-2xl bg-white/40 dark:bg-zinc-900/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isCredit 
                          ? 'bg-green-500/10 text-green-600 dark:text-green-400' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      }`}>
                        {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-extrabold text-stone-850 dark:text-white">{tx.description}</h4>
                        <span className="text-[9px] text-stone-400 block">{new Date(tx.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className={`text-xs sm:text-sm font-black ${
                      isCredit ? 'text-green-600 dark:text-green-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isCredit ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-10 text-xs text-stone-400">No transactions recorded. Load funds or place orders to build history.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
