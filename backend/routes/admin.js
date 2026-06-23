import express from 'express';
import {
  getAdminMetrics,
  getRevenueChartData,
  getAllUsers,
  toggleUserStatus,
  getCoupons,
  createCoupon,
  toggleCouponStatus,
  exportReport
} from '../controllers/adminController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

// All admin routes require token and 'admin' role
router.use(verifyToken);
router.use(checkRole(['admin']));

router.get('/metrics', getAdminMetrics);
router.get('/charts', getRevenueChartData);
router.get('/users', getAllUsers);
router.post('/users/toggle', toggleUserStatus);
router.get('/coupons', getCoupons);
router.post('/coupons', createCoupon);
router.post('/coupons/toggle', toggleCouponStatus);
router.get('/export', exportReport);

export default router;
