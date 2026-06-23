import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, MessageSquareHeart } from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !email || !message) return;

    setSuccess(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">Contact Concierge</h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md mx-auto">Have queries regarding SaaS licensing, partnerships, or order status? We are available 24/7.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Support columns */}
        <div className="space-y-6">
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/10 space-y-4">
            <h3 className="text-sm font-extrabold text-stone-800 dark:text-white uppercase tracking-wider">Quick Details</h3>
            
            <ul className="space-y-4 text-xs text-stone-600 dark:text-stone-400 font-bold">
              <li className="flex items-start gap-2">
                <MapPin size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-850 dark:text-stone-200 block">HQ Office</span>
                  <span>100 Luxury St, Cupertino, California</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Phone size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-850 dark:text-stone-200 block">Telephone Hotline</span>
                  <span>+1 (800) 555-HUNGRY</span>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <Mail size={16} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <span className="text-stone-850 dark:text-stone-200 block">Email Inquiries</span>
                  <span>concierge@hungryhub.com</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Message form */}
        <div className="md:col-span-2 p-8 rounded-[32px] border border-stone-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/10 shadow-sm space-y-6">
          <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Write a Message</span>

          {success && (
            <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-2xl text-xs flex gap-2">
              <MessageSquareHeart size={16} />
              <span>Your message has been received! Our support agents will contact you shortly.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-stone-400 block mb-1 font-bold">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-stone-400 block mb-1 font-bold">Message Details</label>
              <textarea
                required
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you today?"
                className="w-full p-3.5 bg-stone-50 dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 uppercase tracking-wider"
            >
              <Send size={13} /> Send Inquiry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
