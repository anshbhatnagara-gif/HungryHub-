import express from 'express';
import {
  getAllRestaurants,
  getCategories,
  getRestaurantDetails,
  getRestaurantMenu,
  getRestaurantReviews,
  addReview,
  toggleWishlist,
  getWishlist,
  getAIRecommendations
} from '../controllers/restaurantController.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/', getAllRestaurants);
router.get('/categories', getCategories);
router.get('/recommendations', getAIRecommendations);
router.get('/:id', getRestaurantDetails);
router.get('/:id/menu', getRestaurantMenu);
router.get('/:id/reviews', getRestaurantReviews);

// Protected routes
router.post('/reviews', verifyToken, addReview);
router.post('/wishlist/toggle', verifyToken, toggleWishlist);
router.get('/wishlist/list', verifyToken, getWishlist);

export default router;
