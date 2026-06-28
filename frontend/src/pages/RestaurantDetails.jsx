import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Star, Clock, Heart, BadgeAlert, Plus, Minus, Send, MessageSquare } from 'lucide-react';
import { addToCart, removeFromCart, updateQuantity, toggleWishlistState } from '../store/cartSlice.js';
import { useApi } from '../hooks/useApi.js';
import { MenuItemSkeleton } from '../components/SkeletonLoader.jsx';

export default function RestaurantDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { request, loading } = useApi();
  const wishlist = useSelector((state) => state.cart.wishlist);
  const cartItems = useSelector((state) => state.cart.items);
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [vegOnly, setVegOnly] = useState(false);

  // Review Form
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  const isFavorite = wishlist.includes(Number(id));

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const restData = await request(`/api/restaurants/${id}`);
        setRestaurant(restData);

        const menuData = await request(`/api/restaurants/${id}/menu`);
        setMenuItems(menuData || []);

        const reviewsData = await request(`/api/restaurants/${id}/reviews`);
        setReviews(reviewsData || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDetails();
  }, [id, request]);

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    dispatch(toggleWishlistState(Number(id)));
    try {
      await request('/api/restaurants/wishlist/toggle', {
        method: 'POST',
        body: JSON.stringify({ restaurant_id: id })
      });
    } catch (e) {
      console.error(e);
    }
  };

  const getItemQuantity = (itemId) => {
    const cartItem = cartItems.find(i => i.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  const handleAddToCart = (item) => {
    const mockRestaurant = {
      id: restaurant.id,
      name: restaurant.name,
      delivery_fee: 5.00
    };
    dispatch(addToCart({ item, restaurant: mockRestaurant }));
  };

  const handleQuantityChange = (itemId, newQty) => {
    if (newQty <= 0) {
      dispatch(removeFromCart(itemId));
    } else {
      dispatch(updateQuantity({ itemId, quantity: newQty }));
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setReviewLoading(true);
    try {
      // Mock order id for testing review submission
      await request('/api/restaurants/reviews', {
        method: 'POST',
        body: JSON.stringify({
          restaurant_id: Number(id),
          order_id: 1, // Mock linking
          rating,
          comment
        })
      });

      // Re-fetch reviews
      const updated = await request(`/api/restaurants/${id}/reviews`);
      setReviews(updated || []);
      setComment('');
      setRating(5);
    } catch (err) {
      alert(err.message);
    } finally {
      setReviewLoading(false);
    }
  };

  if (!restaurant && loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 space-y-8">
        <div className="h-64 rounded-3xl skeleton-shimmer"></div>
        <div className="space-y-4">
          <div className="h-8 w-1/3 rounded skeleton-shimmer"></div>
          <div className="h-4 w-2/3 rounded skeleton-shimmer"></div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Restaurant Profile Offline.</h2>
        <Link to="/restaurants" className="text-orange-500 hover:underline mt-2 inline-block">Return to search</Link>
      </div>
    );
  }

  const filteredMenu = menuItems.filter(item => !vegOnly || item.is_veg === 1);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Banner Card */}
      <div className="relative h-64 sm:h-80 rounded-[36px] overflow-hidden shadow-xl border border-stone-200/50 dark:border-zinc-800/80">
        <img src={restaurant.image_url} className="w-full h-full object-cover" alt={restaurant.name} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        {/* Floating Wishlist Button */}
        <button
          onClick={handleToggleWishlist}
          className={`absolute top-6 right-6 p-3 rounded-2xl backdrop-blur-md transition-all shadow-md ${
            isFavorite 
              ? 'bg-rose-500 text-white' 
              : 'bg-zinc-950/60 text-white hover:bg-zinc-950/80'
          }`}
        >
          <Heart size={20} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {/* Brand Meta Text */}
        <div className="absolute bottom-8 left-8 text-white space-y-2">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-orange-500 text-white text-[9px] font-black uppercase tracking-wider">
              {restaurant.cuisine_type.split(',')[0]}
            </span>
            <span className="flex items-center text-xs font-bold text-amber-400 gap-0.5">
              <Star size={14} fill="currentColor" /> {restaurant.rating}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{restaurant.name}</h1>
          <p className="text-sm text-stone-300 max-w-xl">{restaurant.description}</p>
        </div>
      </div>

      {/* Menu / Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Menu Items (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-stone-200 dark:border-zinc-900 pb-4">
            <h2 className="text-xl font-extrabold text-stone-800 dark:text-white">Gourmet Menu</h2>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                vegOnly 
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400' 
                  : 'bg-stone-50 dark:bg-zinc-900/30 border-stone-200 dark:border-zinc-800 text-stone-600 dark:text-stone-400'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-green-500"></span> Veg Only
            </button>
          </div>

          <div className="space-y-4">
            {loading && menuItems.length === 0 ? (
              [1, 2, 3].map(i => (
                <MenuItemSkeleton key={i} />
              ))
            ) : filteredMenu.length > 0 ? (
              filteredMenu.map((item) => {
                const qty = getItemQuantity(item.id);
                return (
                  <div
                    key={item.id}
                    className="flex justify-between items-center p-4 border border-stone-200/50 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-zinc-900/20 hover:border-orange-500/20 dark:hover:border-amber-500/20 transition-all gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          item.is_veg === 1 ? 'border-green-600' : 'border-red-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            item.is_veg === 1 ? 'bg-green-600' : 'bg-red-600'
                          }`}></span>
                        </span>
                        <h4 className="text-sm sm:text-base font-extrabold text-stone-800 dark:text-white line-clamp-1">{item.name}</h4>
                      </div>
                      <p className="text-xs text-stone-400 dark:text-zinc-500 line-clamp-2">{item.description}</p>
                      <div className="text-sm font-black text-stone-800 dark:text-white">${Number(item.price || 0).toFixed(2)}</div>
                    </div>

                    <div className="relative shrink-0 w-24 h-24">
                      {item.image_url ? (
                        <img src={item.image_url} className="w-full h-full object-cover rounded-xl shadow-md" alt={item.name} />
                      ) : (
                        <div className="w-full h-full bg-stone-200 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-xs text-stone-400">No Image</div>
                      )}
                      
                      {/* Quantity modifiers */}
                      <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 shadow-md rounded-xl py-1 px-2.5 flex items-center justify-between gap-3 text-stone-800 dark:text-white scale-90">
                        {qty > 0 ? (
                          <>
                            <button onClick={() => handleQuantityChange(item.id, qty - 1)} className="hover:text-orange-500 transition-colors">
                              <Minus size={13} />
                            </button>
                            <span className="text-xs font-black">{qty}</span>
                            <button onClick={() => handleQuantityChange(item.id, qty + 1)} className="hover:text-orange-500 transition-colors">
                              <Plus size={13} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="text-xs font-black uppercase text-orange-500 hover:text-orange-600 tracking-wider flex items-center gap-0.5"
                          >
                            <Plus size={12} /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center py-10 text-xs text-stone-500">No dishes match the active vegetarian filters.</p>
            )}
          </div>
        </div>

        {/* Reviews Section (1 col) */}
        <div className="space-y-6 lg:border-l lg:border-stone-200 lg:dark:border-zinc-900 lg:pl-8">
          <div className="flex items-center space-x-2 border-b border-stone-200 dark:border-zinc-900 pb-4">
            <MessageSquare className="text-orange-500" size={18} />
            <h2 className="text-xl font-extrabold text-stone-800 dark:text-white">Customer Reviews</h2>
          </div>

          {/* Add Review Form */}
          {isAuthenticated ? (
            <form onSubmit={handleAddReview} className="p-4 rounded-2xl bg-stone-50 dark:bg-zinc-900/50 border border-stone-200/60 dark:border-zinc-800/80 space-y-3">
              <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-bold uppercase tracking-wider block">Write a Review</span>
              
              {/* Star selector */}
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-amber-500 hover:scale-110 transition-transform"
                  >
                    <Star size={16} fill={star <= rating ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>

              <div className="relative">
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your dining experience..."
                  rows={2}
                  className="w-full p-3 bg-white dark:bg-zinc-950 border border-stone-200 dark:border-zinc-800 rounded-xl text-xs focus:outline-none text-stone-800 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={reviewLoading}
                className="px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-xs font-bold flex items-center gap-1"
              >
                <Send size={12} /> {reviewLoading ? 'Sending...' : 'Post Review'}
              </button>
            </form>
          ) : (
            <div className="p-4 border border-stone-200 dark:border-zinc-900 rounded-2xl text-center text-xs text-stone-500">
              <Link to="/login" className="text-orange-500 hover:underline font-bold">Sign In</Link> to share comments and reviews.
            </div>
          )}

          {/* Reviews list */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {reviews.length > 0 ? (
              reviews.map((rev) => (
                <div key={rev.id} className="p-3 border border-stone-200/50 dark:border-zinc-900 rounded-2xl space-y-1.5 bg-white/40 dark:bg-zinc-900/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">{rev.user_name}</span>
                    <div className="flex text-amber-500 scale-90">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} size={10} fill={s <= rev.rating ? 'currentColor' : 'none'} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 italic">"{rev.comment}"</p>
                </div>
              ))
            ) : (
              <p className="text-center py-6 text-xs text-stone-400">No customer reviews yet. Be the first to post!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
