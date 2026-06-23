import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Star, Clock, Heart, ToggleLeft } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { toggleWishlistState } from '../store/cartSlice.js';
import { useApi } from '../hooks/useApi.js';
import { RestaurantCardSkeleton } from '../components/SkeletonLoader.jsx';

export default function Restaurants() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const { request, loading } = useApi();
  const wishlist = useSelector((state) => state.cart.wishlist);
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [restaurants, setRestaurants] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [vegOnly, setVegOnly] = useState(false);

  // Parse initial query params from location search
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || '';
    const catParam = params.get('category') || '';
    setSearchTerm(searchParam);
    setSelectedCategory(catParam);
  }, [location.search]);

  // Fetch Restaurants & Categories
  useEffect(() => {
    const fetchData = async () => {
      try {
        const catData = await request('/api/restaurants/categories');
        setCategories(catData || []);

        // Build request URL with params
        let url = '/api/restaurants';
        const params = [];
        if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`);
        if (selectedCategory) params.push(`category=${encodeURIComponent(selectedCategory)}`);
        if (params.length > 0) url += `?${params.join('&')}`;

        const restData = await request(url);
        setRestaurants(restData || []);
      } catch (e) {
        console.error(e);
      }
    };

    fetchData();
  }, [searchTerm, selectedCategory, request]);

  const handleToggleWishlist = async (e, restId) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    dispatch(toggleWishlistState(restId));
    try {
      await request('/api/restaurants/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ restaurant_id: restId })
      });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-black text-stone-800 dark:text-white tracking-tight">Explore Restaurants</h1>
        <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Discover premium cafes and gourmet dining around you</p>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border-b border-stone-200 dark:border-zinc-900 pb-6">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
              !selectedCategory
                ? 'bg-orange-500 border-orange-500 text-white'
                : 'bg-white/40 dark:bg-zinc-900/30 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-900'
            }`}
          >
            All Cuisines
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                selectedCategory === cat.name
                  ? 'bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20'
                  : 'bg-white/40 dark:bg-zinc-900/30 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-zinc-900'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Search & Veg toggle */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64 bg-white dark:bg-zinc-900/50 border border-stone-200 dark:border-zinc-800 rounded-2xl p-1.5 flex items-center">
            <Search className="text-stone-400 dark:text-zinc-500 ml-2" size={16} />
            <input
              type="text"
              placeholder="Search kitchen name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 bg-transparent text-xs text-stone-800 dark:text-white border-none focus:outline-none"
            />
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`px-3 py-2 rounded-2xl text-xs font-extrabold border transition-all whitespace-nowrap flex items-center gap-1.5 ${
              vegOnly 
                ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' 
                : 'bg-white/40 dark:bg-zinc-900/30 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-stone-400'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 border border-white"></span>
            Pure Veg
          </button>
        </div>
      </div>

      {/* Grid of Restaurants */}
      {loading && restaurants.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <RestaurantCardSkeleton key={i} />
          ))}
        </div>
      ) : restaurants.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {restaurants.map((rest) => {
            const isFavorite = wishlist.includes(rest.id);
            return (
              <div
                key={rest.id}
                onClick={() => navigate(`/restaurants/${rest.id}`)}
                className="group cursor-pointer rounded-[32px] border border-stone-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 overflow-hidden hover:shadow-2xl dark:hover:shadow-black/40 hover:scale-[1.01] transition-all p-4 flex flex-col justify-between h-full glow-card"
              >
                <div className="space-y-4">
                  {/* Aspect Ratio banner */}
                  <div className="w-full h-48 rounded-2xl overflow-hidden relative shadow-inner">
                    <img
                      src={rest.image_url}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt={rest.name}
                    />
                    {/* Floating Heart */}
                    <button
                      onClick={(e) => handleToggleWishlist(e, rest.id)}
                      className={`absolute top-4 right-4 p-2 rounded-xl backdrop-blur-md transition-all shadow-md ${
                        isFavorite 
                          ? 'bg-rose-500 text-white' 
                          : 'bg-zinc-950/40 text-white hover:bg-zinc-950/60'
                      }`}
                    >
                      <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    
                    {/* Featured */}
                    {rest.is_featured === 1 && (
                      <div className="absolute top-4 left-4 px-2.5 py-1 rounded-xl bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider shadow-md">
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold tracking-tight text-stone-800 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">
                        {rest.name}
                      </h3>
                      <div className="flex items-center space-x-1 text-xs font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                        <Star size={12} fill="currentColor" />
                        <span>{rest.rating}</span>
                      </div>
                    </div>
                    
                    <p className="text-xs text-stone-400 dark:text-zinc-500 font-medium tracking-wide">
                      {rest.cuisine_type}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-zinc-600 line-clamp-1">
                      {rest.address}
                    </p>
                  </div>
                </div>

                {/* Footer specs */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 dark:border-zinc-800/60 text-xs text-stone-500 dark:text-stone-400 font-bold">
                  <div className="flex items-center gap-1">
                    <Clock size={14} className="text-stone-400" />
                    <span>30-40 min</span>
                  </div>
                  <span>•</span>
                  <span>${rest.commission_rate > 10 ? 'Premium Payout' : 'Standard Delivery'}</span>
                  <span>•</span>
                  <span className="text-orange-500 dark:text-amber-400">Free Delivery</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 rounded-3xl border border-dashed border-stone-200 dark:border-zinc-800 bg-white/30 dark:bg-zinc-900/10">
          <p className="text-sm text-stone-500 dark:text-stone-400 font-semibold">No gourmet kitchens match your current filters.</p>
          <button onClick={() => { setSearchTerm(''); setSelectedCategory(''); }} className="mt-4 text-xs font-extrabold text-orange-500 uppercase tracking-widest hover:underline">
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
}
