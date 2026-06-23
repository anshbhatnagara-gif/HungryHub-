import { useState, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice.js';

export const useApi = () => {
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(
    async (url, options = {}) => {
      setLoading(true);
      setError(null);

      // Setup default headers with token injection
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const fullUrl = url.startsWith('/api') ? `${baseUrl}${url}` : url;
        const response = await fetch(fullUrl, {
          ...options,
          headers,
        });

        const data = await response.json();

        if (!response.ok) {
          // If token expired/unauthorized, log out user
          if (response.status === 401 || response.status === 403) {
            dispatch(logout());
          }
          throw new Error(data.error || 'Something went wrong. Please try again.');
        }

        setLoading(false);
        return data;
      } catch (err) {
        setLoading(false);
        setError(err.message);
        throw err;
      }
    },
    [token, dispatch]
  );

  return { request, loading, error };
};
