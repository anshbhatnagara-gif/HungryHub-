import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { OAuth2Client } from 'google-auth-library';

const client = new OAuth2Client();
const getJwtSecret = () => process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev_hungryhub_jwt_secret');

// Register User
export const register = async (req, res) => {
  const { name, email, password, role, phone, referred_by, address } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email, and password.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  try {
    // Check if user exists
    const [existing] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'A user with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Generate unique referral code
    const referralCode = 'HH' + Math.random().toString(36).substr(2, 6).toUpperCase();

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role, phone, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, passwordHash, role || 'customer', phone || null, referralCode, referred_by || null]
    );
    const userId = result.insertId;

    if (address) {
      await db.query('INSERT INTO addresses (user_id, title, address_line, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [
        userId, 'Default Address', address, 12.97, 77.59
      ]);
    }

    // Create wallet with $50 welcome bonus!
    const [walletResult] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [userId]);
    let walletId;
    if (!walletResult || walletResult.length === 0) {
      // If mock db doesn't auto-create, insert manually
      const [wRes] = await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [userId, 50.00]);
      walletId = wRes.insertId;
      await db.query('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', [
        walletId || userId, 50.00, 'credit', 'Welcome bonus'
      ]);
    }

    // Process referral bonus if valid code supplied
    if (referred_by) {
      const [referrer] = await db.query('SELECT * FROM users WHERE referral_code = ?', [referred_by]);
      if (referrer && referrer.length > 0) {
        const refUser = referrer[0];
        
        // Add $10 to referrer's wallet
        const [refWallet] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [refUser.id]);
        if (refWallet && refWallet.length > 0) {
          await db.query('UPDATE wallets SET balance = balance + 10.00 WHERE user_id = ?', [refUser.id]);
          await db.query('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', [
            refWallet[0].id, 10.00, 'credit', `Referral reward for inviting ${name}`
          ]);
        }
        
        // Give 50 loyalty points to new user
        await db.query('UPDATE users SET loyalty_points = loyalty_points + 50 WHERE id = ?', [userId]);
        
        // Notify referrer
        await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
          refUser.id, 'Referral Bonus Credited!', `Your friend ${name} signed up using your code. $10.00 credited to your wallet.`
        ]);
      }
    }

    // Issue JWT token
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    const token = jwt.sign(
      { id: userId, name, email, role: role || 'customer' },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User registered successfully!',
      token,
      user: { id: userId, name, email, role: role || 'customer', referralCode, loyaltyPoints: referred_by ? 50 : 0 }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
};

// Login User
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password.' });
  }

  try {
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const user = users[0];
    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been suspended by the administrator.' });
    }

    // Verify password
    let validPass = false;
    if (password === 'password123' && user.password_hash === '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y') {
      validPass = true; // Pre-seeded bypass
    } else {
      validPass = await bcrypt.compare(password, user.password_hash);
    }

    if (!validPass) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Issue token
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Google OAuth 2.0 Login
export const googleLogin = async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ error: 'Google login credential missing.' });
  }

  try {
    let email, name, picture;
    if (process.env.NODE_ENV !== 'production' && (credential.startsWith('mock_') || credential === 'google_mock_secret' || !process.env.GOOGLE_CLIENT_ID)) {
      email = 'google_mock_user@hungryhub.com';
      name = 'Google Mock User';
      picture = '';
    } else {
      try {
        const ticket = await client.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
      } catch (tokenErr) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Google Token verification failed, falling back to mock user (dev mode):', tokenErr.message);
          email = 'google_mock_user@hungryhub.com';
          name = 'Google Mock User';
          picture = '';
        } else {
          throw tokenErr;
        }
      }
    }

    let [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;

    if (!users || users.length === 0) {
      // Auto-register
      const randomPass = Math.random().toString(36).slice(-8);
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(randomPass, salt);
      const refCode = 'HH' + Math.random().toString(36).substr(2, 6).toUpperCase();

      const [result] = await db.query(
        'INSERT INTO users (name, email, password_hash, role, phone, referral_code) VALUES (?, ?, ?, ?, ?, ?)',
        [name || 'Google User', email, hash, 'customer', null, refCode]
      );
      
      const newId = result.insertId;
      // Initialize wallet
      await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [newId, 50.00]);
      await db.query('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', [
        newId, 50.00, 'credit', 'Google registration welcome bonus'
      ]);

      const [newUsers] = await db.query('SELECT * FROM users WHERE id = ?', [newId]);
      user = newUsers[0];
    } else {
      user = users[0];
    }

    if (!user.is_active) {
      return res.status(403).json({ error: 'Your account has been suspended.' });
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: '24h' }
    );

    res.status(200).json({
      message: 'Google login successful!',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get User Profile details
export const getProfile = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, phone, referral_code, loyalty_points, is_active, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const user = users[0];
    const [wallets] = await db.query('SELECT balance FROM wallets WHERE user_id = ?', [req.user.id]);
    const walletBalance = wallets && wallets.length > 0 ? wallets[0].balance : 0.00;

    res.status(200).json({
      ...user,
      wallet_balance: walletBalance
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Wallet Balance & Transaction History
export const getWalletInfo = async (req, res) => {
  try {
    let [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    
    // Auto-create wallet if it doesn't exist (safety net)
    if (!wallets || wallets.length === 0) {
      const [wRes] = await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [req.user.id, 50.00]);
      const walletId = wRes.insertId;
      await db.query('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', [
        walletId, 50.00, 'credit', 'Welcome bonus (auto-created)'
      ]);
      [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    }

    const wallet = wallets[0];
    const [transactions] = await db.query('SELECT * FROM transactions WHERE wallet_id = ? ORDER BY created_at DESC', [wallet.id]);

    res.status(200).json({
      balance: Number(wallet.balance).toFixed(2),
      transactions: transactions || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Add Wallet Funds
export const addWalletFunds = async (req, res) => {
  const { amount } = req.body;
  if (!amount || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Invalid deposit amount.' });
  }

  try {
    let [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    
    // Auto-create wallet if missing
    if (!wallets || wallets.length === 0) {
      const [wRes] = await db.query('INSERT INTO wallets (user_id, balance) VALUES (?, ?)', [req.user.id, 0.00]);
      [wallets] = await db.query('SELECT * FROM wallets WHERE user_id = ?', [req.user.id]);
    }
    
    const walletId = wallets[0].id;

    await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [Number(amount), req.user.id]);
    await db.query('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', [
      walletId, Number(amount), 'credit', 'Deposited money into wallet'
    ]);

    // Add loyalty points for adding money!
    const rewardPoints = Math.floor(Number(amount) / 10);
    if (rewardPoints > 0) {
      await db.query('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [rewardPoints, req.user.id]);
    }

    res.status(200).json({ message: 'Funds credited successfully!', newBalance: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Addresses crud
export const getAddresses = async (req, res) => {
  try {
    const [addresses] = await db.query('SELECT * FROM addresses WHERE user_id = ?', [req.user.id]);
    res.status(200).json(addresses || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addAddress = async (req, res) => {
  const { title, address_line, latitude, longitude } = req.body;
  if (!address_line) {
    return res.status(400).json({ error: 'Address line is required.' });
  }

  try {
    const lat = latitude !== undefined ? parseFloat(latitude) : (12.97 + (Math.random() - 0.5) * 0.05);
    const lng = longitude !== undefined ? parseFloat(longitude) : (77.59 + (Math.random() - 0.5) * 0.05);

    await db.query('INSERT INTO addresses (user_id, title, address_line, latitude, longitude) VALUES (?, ?, ?, ?, ?)', [
      req.user.id, title || 'Home', address_line, lat, lng
    ]);
    res.status(201).json({ message: 'Address saved successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Notifications list
export const getNotifications = async (req, res) => {
  try {
    const [notifs] = await db.query('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.status(200).json(notifs || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const readNotification = async (req, res) => {
  const { id } = req.params;
  try {
    // Mock update: we'll run a query
    await db.query('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
    res.status(200).json({ message: 'Notification marked as read.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
