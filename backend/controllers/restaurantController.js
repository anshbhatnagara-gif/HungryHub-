import db, { mockDB } from '../config/db.js';

// Get all restaurants
export const getAllRestaurants = async (req, res) => {
  const { search, category } = req.query;
  try {
    const [restaurants] = await db.query('SELECT * FROM restaurants WHERE is_active = 1', []);
    const [menuItems] = await db.query('SELECT * FROM menu_items WHERE is_available = 1', []);
    const currentHour = new Date().getHours();
    const isOpenNow = currentHour >= 9 && currentHour < 23;
    let filtered = (restaurants || []).map((restaurant) => {
      const items = (menuItems || []).filter(item => Number(item.restaurant_id) === Number(restaurant.id));
      const hasMenu = items.length > 0;
      const nonVegCount = items.filter(item => Number(item.is_veg) === 0).length;
      return {
        ...restaurant,
        is_pure_veg: hasMenu && nonVegCount === 0 ? 1 : 0,
        delivery_time_minutes: 25 + (Number(restaurant.id) % 4) * 5,
        is_open_now: isOpenNow ? 1 : 0
      };
    });

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

export const createRestaurant = async (req, res) => {
  const {
    owner_id,
    name,
    description,
    cuisine_type,
    image_url,
    address,
    latitude = 12.971598,
    longitude = 77.594562,
    delivery_zone = null,
    commission_rate = 10.00,
    is_featured = 0,
    is_active = 1
  } = req.body;

  if (!name || !address) {
    return res.status(400).json({ error: 'Restaurant name and address are required.' });
  }

  const restaurantOwnerId = req.user.role === 'admin' && owner_id ? owner_id : req.user.id;

  try {
    const [result] = await db.query(
      `INSERT INTO restaurants
       (owner_id, name, description, cuisine_type, image_url, address, latitude, longitude, delivery_zone, commission_rate, is_featured, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurantOwnerId,
        name,
        description || '',
        cuisine_type || '',
        image_url || '',
        address,
        Number(latitude),
        Number(longitude),
        delivery_zone,
        Number(commission_rate),
        is_featured ? 1 : 0,
        is_active ? 1 : 0
      ]
    );

    res.status(201).json({ message: 'Restaurant created successfully.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const canManageRestaurant = async (user, restaurantId) => {
  if (user.role === 'admin') return true;
  const [rests] = await db.query('SELECT id FROM restaurants WHERE id = ? AND owner_id = ?', [restaurantId, user.id]);
  return rests && rests.length > 0;
};

export const createMenuItem = async (req, res) => {
  const { id } = req.params;
  const { name, description, price, image_url, category_id, is_veg = 1, is_available = 1 } = req.body;

  if (!name || Number(price) <= 0) {
    return res.status(400).json({ error: 'Dish name and a valid price are required.' });
  }

  try {
    if (!(await canManageRestaurant(req.user, id))) {
      return res.status(403).json({ error: 'You cannot manage this restaurant.' });
    }

    const [result] = await db.query(
      `INSERT INTO menu_items (restaurant_id, category_id, name, description, price, image_url, is_veg, is_available)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, category_id || null, name, description || '', Number(price), image_url || '', is_veg ? 1 : 0, is_available ? 1 : 0]
    );

    res.status(201).json({ message: 'Menu item created successfully.', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateMenuItem = async (req, res) => {
  const { id, itemId } = req.params;
  const { name, description, price, image_url, category_id, is_veg = 1, is_available = 1 } = req.body;

  if (!name || Number(price) <= 0) {
    return res.status(400).json({ error: 'Dish name and a valid price are required.' });
  }

  try {
    if (!(await canManageRestaurant(req.user, id))) {
      return res.status(403).json({ error: 'You cannot manage this restaurant.' });
    }

    await db.query(
      `UPDATE menu_items
       SET name = ?, description = ?, price = ?, image_url = ?, category_id = ?, is_veg = ?, is_available = ?
       WHERE id = ? AND restaurant_id = ?`,
      [name, description || '', Number(price), image_url || '', category_id || null, is_veg ? 1 : 0, is_available ? 1 : 0, itemId, id]
    );

    res.status(200).json({ message: 'Menu item updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteMenuItem = async (req, res) => {
  const { id, itemId } = req.params;

  try {
    if (!(await canManageRestaurant(req.user, id))) {
      return res.status(403).json({ error: 'You cannot manage this restaurant.' });
    }

    await db.query('DELETE FROM menu_items WHERE id = ? AND restaurant_id = ?', [itemId, id]);
    res.status(200).json({ message: 'Menu item removed successfully.' });
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
