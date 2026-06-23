import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  restaurant: null, // Holds { id, name, delivery_fee }
  coupon: null, // Holds { code, discount }
  wishlist: [] // Holds restaurant IDs
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action) {
      const { item, restaurant } = action.payload;
      
      // If adding from a different restaurant, clear cart first
      if (state.restaurant && state.restaurant.id !== restaurant.id) {
        state.items = [];
        state.coupon = null;
      }
      
      state.restaurant = restaurant;
      
      const existing = state.items.find(i => i.id === item.id);
      if (existing) {
        existing.quantity += 1;
      } else {
        state.items.push({ ...item, quantity: 1 });
      }
    },
    removeFromCart(state, action) {
      const itemId = action.payload;
      state.items = state.items.filter(i => i.id !== itemId);
      
      if (state.items.length === 0) {
        state.restaurant = null;
        state.coupon = null;
      }
    },
    updateQuantity(state, action) {
      const { itemId, quantity } = action.payload;
      const item = state.items.find(i => i.id === itemId);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
    },
    applyCoupon(state, action) {
      state.coupon = action.payload; // { code, discount }
    },
    removeCoupon(state) {
      state.coupon = null;
    },
    clearCart(state) {
      state.items = [];
      state.restaurant = null;
      state.coupon = null;
    },
    toggleWishlistState(state, action) {
      const restId = action.payload;
      if (state.wishlist.includes(restId)) {
        state.wishlist = state.wishlist.filter(id => id !== restId);
      } else {
        state.wishlist.push(restId);
      }
    },
    setWishlist(state, action) {
      state.wishlist = action.payload; // array of IDs
    }
  }
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  applyCoupon,
  removeCoupon,
  clearCart,
  toggleWishlistState,
  setWishlist
} = cartSlice.actions;

export default cartSlice.reducer;
