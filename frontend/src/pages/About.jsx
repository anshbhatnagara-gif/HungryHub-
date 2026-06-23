import React from 'react';
import { Award, Compass, Heart, Users } from 'lucide-react';

export default function About() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-16">
      {/* Brand Hero */}
      <section className="text-center space-y-4">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-md mb-2">
          H
        </span>
        <h1 className="text-4xl sm:text-5xl font-black text-stone-800 dark:text-white tracking-tight leading-none">
          Bridging Flavor with <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600">
            Luxury Technology
          </span>
        </h1>
        <p className="text-stone-500 dark:text-stone-400 max-w-xl mx-auto text-sm sm:text-base">
          At HungryHub, we don't just deliver food. We deliver experiences, enabling local culinary masters to reach food connoisseurs with premium speed and execution.
        </p>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center border-y border-stone-200 dark:border-zinc-900 py-10">
        <div>
          <div className="text-3xl font-black text-gradient-orange">120K+</div>
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mt-1">Orders Served</span>
        </div>
        <div>
          <div className="text-3xl font-black text-gradient-orange">450+</div>
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mt-1">Bespoke Kitchens</span>
        </div>
        <div>
          <div className="text-3xl font-black text-gradient-orange">15 Min</div>
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mt-1">Average ETA Speed</span>
        </div>
        <div>
          <div className="text-3xl font-black text-gradient-orange">4.9/5</div>
          <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block mt-1">Average Rating</span>
        </div>
      </section>

      {/* Values */}
      <section className="space-y-8">
        <h2 className="text-2xl font-black text-stone-850 dark:text-white text-center">Core Pillars</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/10 space-y-3">
            <Heart className="text-orange-500" size={24} />
            <h3 className="text-base font-extrabold text-stone-800 dark:text-white">Culinary Love</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">We partner strictly with kitchens that maintain high health standards and use organic ingredients.</p>
          </div>

          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/10 space-y-3">
            <Compass className="text-orange-500" size={24} />
            <h3 className="text-base font-extrabold text-stone-800 dark:text-white">GPS Dispatching</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Our machine learning delivery matching automatically links order coordinates with nearby online riders.</p>
          </div>

          <div className="p-6 rounded-[28px] border border-stone-200 dark:border-zinc-800 bg-stone-50 dark:bg-zinc-900/10 space-y-3">
            <Award className="text-orange-500" size={24} />
            <h3 className="text-base font-extrabold text-stone-800 dark:text-white">Loyalty Perks</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">Enjoy cashbacks, wallet points, and invite-credit systems that reduce dining costs automatically.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
