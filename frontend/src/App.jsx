import React, { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layout & Global components
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';

const Restaurants = lazy(() => import('./pages/Restaurants.jsx'));
const RestaurantDetails = lazy(() => import('./pages/RestaurantDetails.jsx'));
const Cart = lazy(() => import('./pages/Cart.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const OrderTracking = lazy(() => import('./pages/OrderTracking.jsx'));
const Wallet = lazy(() => import('./pages/Wallet.jsx'));
const Profile = lazy(() => import('./pages/Profile.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Signup = lazy(() => import('./pages/Signup.jsx'));
const Contact = lazy(() => import('./pages/Contact.jsx'));
const About = lazy(() => import('./pages/About.jsx'));
const OwnerDashboard = lazy(() => import('./pages/OwnerDashboard.jsx'));
const RiderDashboard = lazy(() => import('./pages/RiderDashboard.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));

export default function App() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  
  // Theme management
  const [theme, setTheme] = useState(localStorage.getItem('hh_theme') || 'light');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('hh_theme', nextTheme);
  };

  // Sync theme with body class
  useEffect(() => {
    const body = document.body;
    if (theme === 'dark') {
      body.classList.add('dark');
    } else {
      body.classList.remove('dark');
    }
  }, [theme]);

  // Protected Route Guard
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
    return children;
  };

  return (
    <Router>
      <div className="horror-site-bg flex flex-col min-h-screen text-stone-900 dark:text-stone-100 transition-colors duration-300">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        
        <main className="flex-1">
          <Suspense
            fallback={
              <div className="min-h-[50vh] flex items-center justify-center text-sm text-stone-500 dark:text-stone-400">
                Loading...
              </div>
            }
          >
            <Routes>
              {/* Customer Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/restaurants" element={<Restaurants />} />
              <Route path="/restaurants/:id" element={<RestaurantDetails />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />

              {/* Protected Customer Pages */}
              <Route path="/checkout" element={
                <ProtectedRoute allowedRoles={['customer', 'admin']}>
                  <Checkout />
                </ProtectedRoute>
              } />
              <Route path="/orders/tracking" element={
                <ProtectedRoute allowedRoles={['customer', 'admin', 'rider']}>
                  <OrderTracking />
                </ProtectedRoute>
              } />
              <Route path="/wallet" element={
                <ProtectedRoute allowedRoles={['customer', 'owner', 'rider', 'admin']}>
                  <Wallet />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute allowedRoles={['customer', 'owner', 'rider', 'admin']}>
                  <Profile />
                </ProtectedRoute>
              } />

              {/* Dashboards */}
              <Route path="/owner" element={
                <ProtectedRoute allowedRoles={['owner', 'admin']}>
                  <OwnerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/rider" element={
                <ProtectedRoute allowedRoles={['rider', 'admin']}>
                  <RiderDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>

        <Footer />
      </div>
    </Router>
  );
}
