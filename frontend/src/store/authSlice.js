import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('hh_token') || null;
const userStr = localStorage.getItem('hh_user');
let user = null;
try {
  user = userStr ? JSON.parse(userStr) : null;
} catch (e) {
  localStorage.removeItem('hh_user');
}

const initialState = {
  user,
  token,
  isAuthenticated: !!token,
  loading: false,
  error: null
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action) {
      const { user, token } = action.payload;
      state.user = user;
      state.token = token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      localStorage.setItem('hh_token', token);
      localStorage.setItem('hh_user', JSON.stringify(user));
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      localStorage.removeItem('hh_token');
      localStorage.removeItem('hh_user');
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    }
  }
});

export const { setCredentials, logout, setLoading, setError } = authSlice.actions;
export default authSlice.reducer;
