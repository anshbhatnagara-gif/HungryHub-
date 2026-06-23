import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Sun, Moon, ShoppingCart, User, LogOut, ShieldAlert, Award, Menu, X, Wallet, Navigation } from 'lucide-react';
import { logout, setCredentials } from '../store/authSlice.js';

export default function Navbar({ theme, toggleTheme }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const cartItems = useSelector((state) => state.cart.items);
  const [menuOpen, setMenuOpen] = useState(false);
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    setMenuOpen(false);
  };

  // Developer Quick Logins
  const quickLogin = async (roleEmail) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: roleEmail, password: 'password123' })
      });
      const data = await response.json();
      if (response.ok) {
        dispatch(setCredentials({ user: data.user, token: data.token }));
        setDevMenuOpen(false);
        if (data.user.role === 'admin') navigate('/admin');
        else if (data.user.role === 'owner') navigate('/owner');
        else if (data.user.role === 'rider') navigate('/rider');
        else navigate('/restaurants');
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <nav className="sticky top-0 z-50 transition-all duration-300 border-b border-white/10 dark:border-zinc-800/50 backdrop-blur-md bg-white/75 dark:bg-zinc-950/75">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md group-hover:scale-105 transition-transform">
              H
            </span>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600">
                HungryHub
              </span>
              <span className="text-[9px] uppercase tracking-widest text-stone-400 dark:text-stone-500 font-bold -mt-1">
                Luxury Dining
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-stone-600 hover:text-orange-500 dark:text-stone-300 dark:hover:text-amber-400 font-medium transition-colors">Home</Link>
            <Link to="/restaurants" className="text-stone-600 hover:text-orange-500 dark:text-stone-300 dark:hover:text-amber-400 font-medium transition-colors">Restaurants</Link>
            <Link to="/about" className="text-stone-600 hover:text-orange-500 dark:text-stone-300 dark:hover:text-amber-400 font-medium transition-colors">About Us</Link>
            <Link to="/contact" className="text-stone-600 hover:text-orange-500 dark:text-stone-300 dark:hover:text-amber-400 font-medium transition-colors">Contact</Link>
            
            {/* Dashboard Redirect hooks based on roles */}
            {isAuthenticated && user && (
              <>
                {user.role === 'owner' && (
                  <Link to="/owner" className="px-3 py-1.5 rounded-lg bg-orange-500/10 text-orange-500 dark:bg-amber-500/10 dark:text-amber-400 font-semibold border border-orange-500/20 hover:bg-orange-500/20 transition-all flex items-center gap-1.5">
                    <ShieldAlert size={15} /> Owner Panel
                  </Link>
                )}
                {user.role === 'rider' && (
                  <Link to="/rider" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-400 font-semibold border border-emerald-500/20 hover:bg-emerald-500/20 transition-all flex items-center gap-1.5">
                    <Navigation size={15} /> Rider Panel
                  </Link>
                )}
                {user.role === 'admin' && (
                  <Link to="/admin" className="px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400 font-semibold border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5">
                    <ShieldAlert size={15} /> Admin Dashboard
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Desktop Right Hand Controls */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Developer switches */}
            <div className="relative">
              <button 
                onClick={() => setDevMenuOpen(!devMenuOpen)}
                className="px-2.5 py-1 text-xs font-bold text-white uppercase rounded bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition-all"
              >
                Roles Sandbox
              </button>
              {devMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-xl bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-2 space-y-1">
                  <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider px-2 py-1">Quick Login Roles</p>
                  <button onClick={() => quickLogin('customer@hungryhub.com')} className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-300">Customer Mode</button>
                  <button onClick={() => quickLogin('owner@hungryhub.com')} className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-300">Restaurant Owner</button>
                  <button onClick={() => quickLogin('rider@hungryhub.com')} className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-300">Rider Partner</button>
                  <button onClick={() => quickLogin('admin@hungryhub.com')} className="w-full text-left px-3 py-1.5 text-xs font-medium rounded-lg hover:bg-stone-100 dark:hover:bg-zinc-800 text-stone-700 dark:text-stone-300">Super Admin</button>
                </div>
              )}
            </div>

            {/* Theme selector */}
            <button
              onClick={toggleTheme}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            {/* Cart Icon */}
            <Link to="/cart" className="relative p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all">
              <ShoppingCart size={20} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-orange-500 to-rose-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border border-white dark:border-zinc-950 scale-90">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* Auth options */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <Link to="/wallet" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 dark:border-zinc-800 hover:bg-stone-50 dark:hover:bg-zinc-900 text-stone-600 dark:text-stone-300 transition-colors">
                  <Wallet size={16} className="text-amber-500" />
                  <span className="text-xs font-bold text-gradient-orange">Wallet</span>
                </Link>
                <Link to="/profile" className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all">
                  <User size={20} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="p-2 text-stone-400 hover:text-rose-500 dark:text-stone-500 dark:hover:text-rose-400 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link to="/login" className="px-4 py-2 text-sm font-medium text-stone-700 dark:text-stone-300 hover:text-orange-500 transition-colors">
                  Sign In
                </Link>
                <Link to="/signup" className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 rounded-xl shadow-md transition-opacity">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu trigger */}
          <div className="md:hidden flex items-center space-x-2">
            <button
              onClick={toggleTheme}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <Link to="/cart" className="relative p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all">
              <ShoppingCart size={18} />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[9px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white dark:border-zinc-950">
                  {cartCount}
                </span>
              )}
            </Link>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-zinc-800/50 rounded-xl transition-all"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer navigation */}
      {menuOpen && (
        <div className="md:hidden glass-panel-light dark:glass-panel-dark border-t border-white/10 dark:border-zinc-800/50 py-4 px-6 space-y-3">
          <Link to="/" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-600 dark:text-stone-300 font-medium">Home</Link>
          <Link to="/restaurants" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-600 dark:text-stone-300 font-medium">Restaurants</Link>
          <Link to="/about" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-600 dark:text-stone-300 font-medium">About Us</Link>
          <Link to="/contact" onClick={() => setMenuOpen(false)} className="block py-2 text-stone-600 dark:text-stone-300 font-medium">Contact</Link>
          
          <div className="border-t border-stone-200 dark:border-zinc-800/80 pt-3">
            <p className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider mb-2">Roles Sandbox</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setMenuOpen(false); quickLogin('customer@hungryhub.com'); }} className="px-2 py-1 text-xs text-center border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300 rounded">Customer</button>
              <button onClick={() => { setMenuOpen(false); quickLogin('owner@hungryhub.com'); }} className="px-2 py-1 text-xs text-center border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300 rounded">Chef Owner</button>
              <button onClick={() => { setMenuOpen(false); quickLogin('rider@hungryhub.com'); }} className="px-2 py-1 text-xs text-center border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300 rounded">Rider</button>
              <button onClick={() => { setMenuOpen(false); quickLogin('admin@hungryhub.com'); }} className="px-2 py-1 text-xs text-center border border-stone-200 dark:border-zinc-800 text-stone-700 dark:text-stone-300 rounded">Admin</button>
            </div>
          </div>

          <div className="border-t border-stone-200 dark:border-zinc-800/80 pt-3">
            {isAuthenticated ? (
              <div className="space-y-2">
                <Link to="/wallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2 text-stone-600 dark:text-stone-300 font-medium">
                  <Wallet size={18} className="text-amber-500" /> Wallet Balance
                </Link>
                <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 py-2 text-stone-600 dark:text-stone-300 font-medium">
                  <User size={18} /> My Profile
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left flex items-center gap-2 py-2 text-rose-500 font-medium"
                >
                  <LogOut size={18} /> Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col space-y-2 pt-2">
                <Link to="/login" onClick={() => setMenuOpen(false)} className="text-center py-2 text-stone-700 dark:text-stone-300 font-medium border border-stone-200 dark:border-zinc-800 rounded-xl">
                  Sign In
                </Link>
                <Link to="/signup" onClick={() => setMenuOpen(false)} className="text-center py-2 bg-gradient-to-r from-amber-500 to-rose-600 text-white font-bold rounded-xl shadow-md">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
