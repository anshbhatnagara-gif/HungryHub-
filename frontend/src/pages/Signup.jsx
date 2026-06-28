import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { User, Mail, Lock, Phone, Gift, ShieldAlert, UserCheck, MapPin } from 'lucide-react';
import { Autocomplete, useJsApiLoader } from '@react-google-maps/api';
import { setCredentials } from '../store/authSlice.js';
import { GoogleLogin } from '@react-oauth/google';

function ManualAddressInput({ value, onChange, placeholder = 'Enter full address manually...' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
    />
  );
}

function GoogleAddressInput({ value, onChange, mapsApiKey }) {
  const [autocomplete, setAutocomplete] = useState(null);
  const { isLoaded } = useJsApiLoader({
    id: 'google-places-script',
    googleMapsApiKey: mapsApiKey,
    libraries: ['places']
  });

  const onPlaceChanged = () => {
    if (!autocomplete) return;
    onChange(autocomplete.getPlace().formatted_address || '');
  };

  if (!isLoaded) {
    return <ManualAddressInput value={value} onChange={onChange} placeholder="Loading address search..." />;
  }

  return (
    <Autocomplete onLoad={setAutocomplete} onPlaceChanged={onPlaceChanged}>
      <ManualAddressInput value={value} onChange={onChange} placeholder="Search your location..." />
    </Autocomplete>
  );
}

function AddressInput({ value, onChange }) {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  if (!mapsApiKey) {
    return <ManualAddressInput value={value} onChange={onChange} />;
  }

  return <GoogleAddressInput value={value} onChange={onChange} mapsApiKey={mapsApiKey} />;
}

export default function Signup() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [referredBy, setReferredBy] = useState('');
  const [role, setRole] = useState('customer'); // Default customer, can also register as owner/rider
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: phone || null,
          referred_by: referredBy || null,
          address: address || null
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed.');
      }

      dispatch(setCredentials({ user: data.user, token: data.token }));
      
      // Route based on role
      if (data.user.role === 'owner') navigate('/owner');
      else if (data.user.role === 'rider') navigate('/rider');
      else navigate('/restaurants');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 transition-colors">
      <div className="w-full max-w-md p-8 rounded-3xl glass-panel-light dark:glass-panel-dark shadow-2xl">
        <div className="text-center mb-8">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center text-white font-black text-2xl mx-auto shadow-md mb-3">
            H
          </span>
          <h2 className="text-2xl font-black tracking-tight text-stone-800 dark:text-white">Create Account</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Delivering Happiness, One Bite at a Time.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Full Name</label>
            <div className="relative">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
              />
              <User className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Email Address</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
              />
              <Mail className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Phone Number</label>
              <div className="relative">
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+155512345"
                  className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
                />
                <Phone className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Select Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all font-semibold"
              >
                <option value="customer">Customer</option>
                <option value="owner">Restaurant Owner</option>
                <option value="rider">Delivery Rider</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Full Address (for delivery/restaurant)</label>
            <div className="relative">
              <AddressInput value={address} onChange={setAddress} />
              <MapPin className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600 z-10 pointer-events-none" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
              />
              <Lock className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block mb-1">Referral Code (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={referredBy}
                onChange={(e) => setReferredBy(e.target.value)}
                placeholder="Enter invite code"
                className="w-full pl-10 pr-4 py-2.5 bg-white/50 dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/40 text-stone-800 dark:text-white transition-all"
              />
              <Gift className="absolute left-3.5 top-3.5 text-stone-400 dark:text-zinc-600" size={16} />
            </div>
            <p className="text-[10px] text-stone-400 mt-1 pl-1">Earn a $50 registration bonus + extra loyalty points on signing up.</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-sm rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5"
          >
            <UserCheck size={16} /> {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <div className="relative my-6 text-center">
          <span className="absolute inset-x-0 top-3 border-b border-stone-200 dark:border-zinc-800/80"></span>
          <span className="relative px-3 py-0.5 bg-stone-100 dark:bg-zinc-950 text-xs text-stone-400 dark:text-zinc-600 rounded-md font-semibold">OR</span>
        </div>

        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              setLoading(true);
              setError(null);
              try {
                const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/auth/google-login`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ credential: credentialResponse.credential })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
          
                dispatch(setCredentials({ user: data.user, token: data.token }));
                navigate('/restaurants');
              } catch (err) {
                setError(err.message);
              } finally {
                setLoading(false);
              }
            }}
            onError={() => setError('Google Sign-In was unsuccessful. Try again later.')}
            shape="rectangular"
            theme="outline"
            size="large"
            text="signup_with"
          />
        </div>

        <p className="text-center text-xs text-stone-500 dark:text-stone-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-orange-500 hover:text-orange-600 font-bold">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
