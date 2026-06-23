import express from 'express';
import {
  checkout,
  getOrderHistory,
  getOrderDetails,
  validateCoupon,
  restaurantGetOrders,
  restaurantUpdateStatus,
  riderGetAvailableOrders,
  riderAcceptOrder,
  riderCompleteDelivery,
  riderGetEarnings,
  riderUpdateStatus
} from '../controllers/orderController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Protected paths for logged-in users
router.post('/checkout', verifyToken, checkout);
router.get('/history', verifyToken, getOrderHistory);
router.post('/coupon/validate', verifyToken, validateCoupon);
router.get('/:id', verifyToken, getOrderDetails);

// Restaurant owner endpoints
router.get('/restaurant/list', verifyToken, checkRole(['owner', 'admin']), restaurantGetOrders);
router.post('/restaurant/status', verifyToken, checkRole(['owner', 'admin']), restaurantUpdateStatus);

// Rider endpoints
router.get('/rider/available', verifyToken, checkRole(['rider', 'admin']), riderGetAvailableOrders);
router.post('/rider/accept', verifyToken, checkRole(['rider', 'admin']), riderAcceptOrder);
router.post('/rider/complete', verifyToken, checkRole(['rider', 'admin']), riderCompleteDelivery);
router.get('/rider/earnings', verifyToken, checkRole(['rider', 'admin']), riderGetEarnings);
router.post('/rider/status', verifyToken, checkRole(['rider', 'admin']), riderUpdateStatus);

export default router;
