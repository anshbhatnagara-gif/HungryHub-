import express from 'express';
import {
  getAllRestaurants,
  getCategories,
  getRestaurantDetails,
  getRestaurantMenu,
  createRestaurant,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getRestaurantReviews,
  addReview,
  toggleWishlist,
  getWishlist,
  getAIRecommendations
} from '../controllers/restaurantController.js';
import { verifyToken, checkRole } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllRestaurants);
router.post('/', verifyToken, checkRole(['owner', 'admin']), createRestaurant);
router.get('/categories', getCategories);
router.get('/recommendations', getAIRecommendations);
router.get('/:id', getRestaurantDetails);
router.get('/:id/menu', getRestaurantMenu);
router.post('/:id/menu', verifyToken, checkRole(['owner', 'admin']), createMenuItem);
router.put('/:id/menu/:itemId', verifyToken, checkRole(['owner', 'admin']), updateMenuItem);
router.delete('/:id/menu/:itemId', verifyToken, checkRole(['owner', 'admin']), deleteMenuItem);
router.get('/:id/reviews', getRestaurantReviews);

// Protected routes
router.post('/reviews', verifyToken, addReview);
router.post('/wishlist/toggle', verifyToken, toggleWishlist);
router.get('/wishlist/list', verifyToken, getWishlist);

export default router;
