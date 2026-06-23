import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Search, ChevronRight, Star, Sparkles, Plus, Check } from 'lucide-react';
import { addToCart } from '../store/cartSlice.js';
import { useApi } from '../hooks/useApi.js';

export default function Home() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { request } = useApi();
  const [searchVal, setSearchVal] = useState('');
  const [categories, setCategories] = useState([]);
  const [aiDishes, setAiDishes] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [addedItems, setAddedItems] = useState({});

  useEffect(() => {
    // Fetch global categories
    const fetchCats = async () => {
      try {
        const data = await request('/api/restaurants/categories');
        setCategories(data.slice(0, 6)); // Display up to 6
      } catch (e) {
        console.error(e);
      }
    };

    // Fetch AI recommendations
    const fetchAI = async () => {
      setAiLoading(true);
      try {
        const data = await request('/api/restaurants/recommendations');
        setAiDishes(data);
      } catch (e) {
        console.error(e);
      } finally {
        setAiLoading(false);
      }
    };

    fetchCats();
    fetchAI();
  }, [request]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/restaurants?search=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  const handleAddAiItem = (item) => {
    const mockRestaurant = {
      id: item.restaurant_id,
      name: item.restaurant_name || 'Premium Bistro',
      delivery_fee: 5.00
    };
    dispatch(addToCart({ item, restaurant: mockRestaurant }));
    
    // Animate badge
    setAddedItems(prev => ({ ...prev, [item.id]: true }));
    setTimeout(() => {
      setAddedItems(prev => ({ ...prev, [item.id]: false }));
    }, 1500);
  };

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden bg-zinc-950 text-white rounded-b-[40px] sm:rounded-b-[60px] px-4 py-16">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1600&auto=format&fit=crop&q=80"
            className="w-full h-full object-cover opacity-25 filter blur-[2px]"
            alt="Delicious food background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/70 to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8 px-4">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-xs font-semibold animate-pulse">
            <Sparkles size={14} /> Delivering Happiness, One Bite at a Time.
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none">
            Relish Gourmet Dining <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-500 to-rose-600">
              At Your Doorstep
            </span>
          </h1>

          <p className="text-stone-300 max-w-xl mx-auto text-sm sm:text-base">
            Skip the cooking. Browse world-class cuisines from neighborhood stalwarts to five-star luxury chefs. Fast, secure, and hot.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex items-center bg-white dark:bg-zinc-900 border border-stone-200 dark:border-zinc-800 p-2 rounded-2xl sm:rounded-3xl shadow-xl">
            <Search className="text-stone-400 dark:text-zinc-500 ml-3 shrink-0" size={20} />
            <input
              type="text"
              placeholder="Search gourmet restaurants or your favorite dishes..."
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              className="w-full px-3 py-2 bg-transparent text-stone-800 dark:text-white border-none focus:outline-none text-sm sm:text-base"
            />
            <button
              type="submit"
              className="px-6 py-2.5 sm:py-3 bg-gradient-to-r from-amber-500 to-rose-600 hover:opacity-90 active:scale-[0.98] text-white font-extrabold text-xs sm:text-sm rounded-xl sm:rounded-2xl transition-all shadow-md shrink-0"
            >
              Explore
            </button>
          </form>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-stone-800 dark:text-white">Trending Cuisines</h2>
            <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Browse meals by category filters</p>
          </div>
          <Link to="/restaurants" className="flex items-center text-xs font-extrabold text-orange-500 hover:text-orange-600 transition-colors uppercase tracking-wider gap-0.5">
            View All <ChevronRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6">
          {categories.length > 0 ? (
            categories.map((cat) => (
              <div
                key={cat.id}
                onClick={() => navigate(`/restaurants?category=${encodeURIComponent(cat.name)}`)}
                className="group relative cursor-pointer overflow-hidden rounded-3xl border border-stone-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 p-4 text-center hover:shadow-lg dark:hover:shadow-black/20 hover:scale-[1.03] transition-all"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden mx-auto mb-3 shadow-md border border-stone-100 dark:border-zinc-800">
                  <img src={cat.image_url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={cat.name} />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300 tracking-tight">{cat.name}</h4>
              </div>
            ))
          ) : (
            [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 rounded-3xl skeleton-shimmer"></div>
            ))
          )}
        </div>
      </section>

      {/* Promos Banner */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-8 sm:p-12 rounded-[32px] bg-gradient-to-r from-amber-500 via-orange-500 to-rose-600 text-white relative overflow-hidden shadow-xl">
          <div className="absolute right-0 bottom-0 opacity-15 w-96 h-96 rounded-full bg-white/20 blur-3xl"></div>
          <div className="relative z-10 max-w-lg space-y-4">
            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-extrabold uppercase tracking-widest">Seasonal Promo</span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">Get Flat 50% Off On Your First Feast</h2>
            <p className="text-stone-100 text-xs sm:text-sm">
              Use code <span className="font-extrabold underline text-amber-200">HUNGRY50</span> at checkout. Valid on orders above $30. Let's make today special!
            </p>
            <Link to="/restaurants" className="inline-flex items-center px-5 py-2.5 bg-zinc-950 text-white font-bold text-xs rounded-xl hover:bg-zinc-900 transition-colors">
              Claim Discount Now
            </Link>
          </div>
        </div>
      </section>

      {/* AI Recommendations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center space-x-2">
            <Sparkles className="text-orange-500 fill-orange-500/20" size={20} />
            <h2 className="text-2xl font-black text-stone-800 dark:text-white">AI Powered Chef Choices</h2>
          </div>
          <p className="text-xs text-stone-400 dark:text-zinc-500 mt-1">Personalized flavor matches based on community favorites</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {aiLoading ? (
            [1, 2, 3, 4].map(n => (
              <div key={n} className="h-80 rounded-[32px] skeleton-shimmer"></div>
            ))
          ) : (
            aiDishes.map((dish) => (
              <div
                key={dish.id}
                className="group relative overflow-hidden rounded-[32px] border border-stone-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900/30 hover:shadow-xl dark:hover:shadow-black/30 hover:scale-[1.02] transition-all p-4 flex flex-col justify-between"
              >
                {/* Score badge */}
                <div className="absolute top-4 left-4 z-10 px-2.5 py-1 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[9px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-md">
                  <Sparkles size={10} /> {dish.ai_match_score}% Match
                </div>

                <div className="space-y-4">
                  <div className="w-full h-44 rounded-2xl overflow-hidden shadow-inner border border-stone-100 dark:border-zinc-800 relative">
                    <img src={dish.image_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={dish.name} />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-orange-500 dark:text-amber-400 font-extrabold uppercase tracking-widest block">{dish.restaurant_name}</span>
                    <h3 className="text-base font-bold tracking-tight text-stone-800 dark:text-white group-hover:text-orange-500 transition-colors line-clamp-1">{dish.name}</h3>
                    <p className="text-xs text-stone-400 dark:text-zinc-500 line-clamp-2">{dish.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-stone-100 dark:border-zinc-800/60">
                  <span className="text-lg font-black text-stone-800 dark:text-white">${dish.price.toFixed(2)}</span>
                  <button
                    onClick={() => handleAddAiItem(dish)}
                    className="p-2 rounded-xl bg-orange-500 text-white hover:bg-orange-600 shadow-md active:scale-95 transition-all flex items-center gap-1"
                  >
                    {addedItems[dish.id] ? <Check size={16} /> : <Plus size={16} />}
                    <span className="text-xs font-bold px-1">{addedItems[dish.id] ? 'Added' : 'Add'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
