import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layout & Global components
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

// Pages
import Home from './pages/Home.jsx';
import Restaurants from './pages/Restaurants.jsx';
import RestaurantDetails from './pages/RestaurantDetails.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderTracking from './pages/OrderTracking.jsx';
import Wallet from './pages/Wallet.jsx';
import Profile from './pages/Profile.jsx';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Contact from './pages/Contact.jsx';
import About from './pages/About.jsx';

// Dashboards
import OwnerDashboard from './pages/OwnerDashboard.jsx';
import RiderDashboard from './pages/RiderDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';

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
    <Router basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col min-h-screen bg-stone-50 text-stone-900 dark:bg-zinc-950 dark:text-stone-100 transition-colors duration-300">
        <Navbar theme={theme} toggleTheme={toggleTheme} />
        
        <main className="flex-1">
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
        </main>

        <Footer />
      </div>
    </Router>
  );
}
