import db, { mockDB } from '../config/db.js';

// Get all restaurants
export const getAllRestaurants = async (req, res) => {
  const { search, category } = req.query;
  try {
    const [restaurants] = await db.query('SELECT * FROM restaurants WHERE is_active = 1', []);
    let filtered = restaurants || [];

    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter(r => 
        r.name.toLowerCase().includes(term) || 
        r.cuisine_type.toLowerCase().includes(term)
      );
    }

    if (category) {
      // Find category name or match cuisine type
      const term = category.toLowerCase();
      filtered = filtered.filter(r => 
        r.cuisine_type.toLowerCase().includes(term)
      );
    }

    res.status(200).json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get categories
export const getCategories = async (req, res) => {
  try {
    const [categories] = await db.query('SELECT * FROM categories', []);
    res.status(200).json(categories || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single restaurant detail
export const getRestaurantDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [rests] = await db.query('SELECT * FROM restaurants WHERE id = ?', [id]);
    if (!rests || rests.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found.' });
    }
    res.status(200).json(rests[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get restaurant menu
export const getRestaurantMenu = async (req, res) => {
  const { id } = req.params;
  try {
    const [items] = await db.query('SELECT * FROM menu_items WHERE restaurant_id = ? AND is_available = 1', [id]);
    res.status(200).json(items || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get restaurant reviews
export const getRestaurantReviews = async (req, res) => {
  const { id } = req.params;
  try {
    const [reviews] = await db.query(
      `SELECT r.*, u.name as user_name FROM reviews r 
       JOIN users u ON r.user_id = u.id 
       WHERE r.restaurant_id = ? 
       ORDER BY r.created_at DESC`, [id]);
    res.status(200).json(reviews || []);
  } catch (err) {
    // If SQL JOIN fails in mock db, do local matching
    if (db.isMock()) {
      const filtered = mockDB.reviews.filter(rev => rev.restaurant_id === Number(id));
      const enriched = filtered.map(rev => {
        const user = mockDB.users.find(u => u.id === rev.user_id);
        return { ...rev, user_name: user ? user.name : 'Valued Customer' };
      });
      return res.status(200).json(enriched);
    }
    res.status(500).json({ error: err.message });
  }
};

// Add Review
export const addReview = async (req, res) => {
  const { restaurant_id, order_id, rating, comment } = req.body;
  if (!restaurant_id || !order_id || !rating) {
    return res.status(400).json({ error: 'Missing required review fields.' });
  }

  try {
    await db.query('INSERT INTO reviews (user_id, restaurant_id, order_id, rating, comment) VALUES (?, ?, ?, ?, ?)', [
      req.user.id, restaurant_id, order_id, rating, comment || ''
    ]);

    // Recalculate average rating
    const [reviews] = await db.query('SELECT AVG(rating) as avg_rating FROM reviews WHERE restaurant_id = ?', [restaurant_id]);
    if (reviews && reviews.length > 0) {
      const avg = Number(Number(reviews[0].avg_rating).toFixed(1));
      await db.query('UPDATE restaurants SET rating = ? WHERE id = ?', [avg, restaurant_id]);
    }

    res.status(201).json({ message: 'Review submitted successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Wishlist toggle
export const toggleWishlist = async (req, res) => {
  const { restaurant_id } = req.body;
  try {
    if (db.isMock()) {
      const index = mockDB.wishlist.findIndex(w => w.user_id === req.user.id && w.restaurant_id === Number(restaurant_id));
      if (index > -1) {
        mockDB.wishlist.splice(index, 1);
        return res.status(200).json({ added: false, message: 'Removed from favorites.' });
      } else {
        mockDB.wishlist.push({ user_id: req.user.id, restaurant_id: Number(restaurant_id) });
        return res.status(200).json({ added: true, message: 'Added to favorites.' });
      }
    }

    const [exists] = await db.query('SELECT * FROM wishlist WHERE user_id = ? AND restaurant_id = ?', [req.user.id, restaurant_id]);
    if (exists && exists.length > 0) {
      await db.query('DELETE FROM wishlist WHERE user_id = ? AND restaurant_id = ?', [req.user.id, restaurant_id]);
      res.status(200).json({ added: false, message: 'Removed from favorites.' });
    } else {
      await db.query('INSERT INTO wishlist (user_id, restaurant_id) VALUES (?, ?)', [req.user.id, restaurant_id]);
      res.status(200).json({ added: true, message: 'Added to favorites.' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get wishlist items
export const getWishlist = async (req, res) => {
  try {
    if (db.isMock()) {
      const ids = mockDB.wishlist.filter(w => w.user_id === req.user.id).map(w => w.restaurant_id);
      const list = mockDB.restaurants.filter(r => ids.includes(r.id));
      return res.status(200).json(list);
    }

    const [wishlist] = await db.query(
      `SELECT r.* FROM wishlist w 
       JOIN restaurants r ON w.restaurant_id = r.id 
       WHERE w.user_id = ?`, [req.user.id]
    );
    res.status(200).json(wishlist || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// AI Food Recommendations
export const getAIRecommendations = async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM menu_items WHERE is_available = 1', []);
    let pool = items || [];
    
    // Sort randomly and pick 4 dishes for visual presentation
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const recommendations = shuffled.slice(0, 4).map(item => {
      // Enrich with restaurant name
      let restName = 'HungryHub Chef';
      if (db.isMock()) {
        const r = mockDB.restaurants.find(rest => rest.id === item.restaurant_id);
        if (r) restName = r.name;
      }
      return {
        ...item,
        restaurant_name: restName,
        ai_match_score: Math.floor(Math.random() * 15) + 85 // Mock AI confidence score (85% to 99%)
      };
    });

    res.status(200).json(recommendations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
