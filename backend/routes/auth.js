import express from 'express';
import {
  register,
  login,
  googleLogin,
  getProfile,
  getWalletInfo,
  addWalletFunds,
  getAddresses,
  addAddress,
  getNotifications,
  readNotification
} from '../controllers/authController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google-login', googleLogin);

// Protected routes
router.get('/profile', verifyToken, getProfile);
router.get('/wallet', verifyToken, getWalletInfo);
router.post('/wallet/add', verifyToken, addWalletFunds);
router.get('/addresses', verifyToken, getAddresses);
router.post('/addresses', verifyToken, addAddress);
router.get('/notifications', verifyToken, getNotifications);
router.put('/notifications/:id/read', verifyToken, readNotification);

export default router;
