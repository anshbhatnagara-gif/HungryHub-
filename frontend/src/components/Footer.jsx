import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Github, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-black/45 backdrop-blur-md border-t border-white/10 pt-16 pb-8 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-extrabold text-base">
                H
              </span>
              <span className="text-lg font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600">
                HungryHub
              </span>
            </div>
            <p className="text-sm text-stone-500 dark:text-stone-400 italic">
              "Delivering Happiness, One Bite at a Time."
            </p>
            <p className="text-xs text-stone-400 dark:text-zinc-600">
              A premium, world-class SaaS eco-system bridging culinary artisans with food enthusiasts globally.
            </p>
            {/* Social Icons */}
            <div className="flex space-x-3 pt-2">
              <a href="#" className="p-2 text-stone-500 hover:text-orange-500 dark:text-stone-400 dark:hover:text-amber-400 rounded-lg hover:bg-stone-200 dark:hover:bg-zinc-900 transition-all">
                <Facebook size={16} />
              </a>
              <a href="#" className="p-2 text-stone-500 hover:text-orange-500 dark:text-stone-400 dark:hover:text-amber-400 rounded-lg hover:bg-stone-200 dark:hover:bg-zinc-900 transition-all">
                <Instagram size={16} />
              </a>
              <a href="#" className="p-2 text-stone-500 hover:text-orange-500 dark:text-stone-400 dark:hover:text-amber-400 rounded-lg hover:bg-stone-200 dark:hover:bg-zinc-900 transition-all">
                <Twitter size={16} />
              </a>
              <a href="#" className="p-2 text-stone-500 hover:text-orange-500 dark:text-stone-400 dark:hover:text-amber-400 rounded-lg hover:bg-stone-200 dark:hover:bg-zinc-900 transition-all">
                <Github size={16} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-4">Discover</h3>
            <ul className="space-y-2">
              <li><Link to="/restaurants" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Premium Brands</Link></li>
              <li><Link to="/about" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Our Mission</Link></li>
              <li><Link to="/contact" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Support Channels</Link></li>
              <li><a href="#" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Partner Program</a></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Terms of Service</a></li>
              <li><a href="#" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">Refund Guidelines</a></li>
              <li><a href="#" className="text-sm text-stone-500 dark:text-stone-400 hover:text-orange-500 dark:hover:text-amber-400 transition-colors">SaaS Licensing</a></li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wider mb-4">Support Hub</h3>
            <ul className="space-y-3">
              <li className="flex items-center text-sm text-stone-500 dark:text-stone-400">
                <MapPin size={16} className="text-orange-500 mr-2 shrink-0" />
                <span>100 Luxury Avenue, Cupertino, CA</span>
              </li>
              <li className="flex items-center text-sm text-stone-500 dark:text-stone-400">
                <Phone size={16} className="text-orange-500 mr-2 shrink-0" />
                <span>+1 (800) 555-HUNGRY</span>
              </li>
              <li className="flex items-center text-sm text-stone-500 dark:text-stone-400">
                <Mail size={16} className="text-orange-500 mr-2 shrink-0" />
                <span>concierge@hungryhub.com</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-stone-200 dark:border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-400 dark:text-zinc-600">
          <p>Copyright 2026 HungryHub Inc. All rights reserved.</p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <a href="#" className="hover:text-orange-500">Security</a>
            <a href="#" className="hover:text-orange-500">System Status</a>
            <a href="#" className="hover:text-orange-500">Developer API</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
