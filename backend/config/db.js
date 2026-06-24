import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool = null;
let isFallback = false;

// Mock Data Store for In-Memory Fallback
const mockDB = {
  users: [
    { id: 1, name: 'Super Admin', email: 'admin@hungryhub.com', password_hash: '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', role: 'admin', phone: '+1234567890', referral_code: 'ADMIN999', loyalty_points: 1000, is_active: 1 },
    { id: 2, name: 'Chef Giovanni (Owner)', email: 'owner@hungryhub.com', password_hash: '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', role: 'owner', phone: '+1987654321', referral_code: 'OWNER555', loyalty_points: 0, is_active: 1 },
    { id: 3, name: 'Alex Rider (Delivery)', email: 'rider@hungryhub.com', password_hash: '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', role: 'rider', phone: '+1555444333', referral_code: 'RIDER111', loyalty_points: 100, is_active: 1 },
    { id: 4, name: 'Sarah Jenkins (Customer)', email: 'customer@hungryhub.com', password_hash: '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', role: 'customer', phone: '+1444555666', referral_code: 'SARAH444', loyalty_points: 250, is_active: 1 }
  ],
  wallets: [
    { id: 1, user_id: 1, balance: 10000.00 },
    { id: 2, user_id: 2, balance: 250.00 },
    { id: 3, user_id: 3, balance: 50.00 },
    { id: 4, user_id: 4, balance: 500.00 }
  ],
  addresses: [
    { id: 1, user_id: 4, title: 'Home', address_line: '742 Evergreen Terrace, Springfield', latitude: 12.972442, longitude: 77.590643 },
    { id: 2, user_id: 4, title: 'Work', address_line: '100 Infinity Loop, Cupertino', latitude: 12.981267, longitude: 77.601552 }
  ],
  riders: [
    { id: 1, user_id: 3, vehicle_number: 'KA-03-EX-1234', vehicle_type: 'Electric Scooter', status: 'online', latitude: 12.971598, longitude: 77.594562, earnings: 120.50 }
  ],
  categories: [
    { id: 1, name: 'Burgers', image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60' },
    { id: 2, name: 'Pizzas', image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60' },
    { id: 3, name: 'Sushi & Asian', image_url: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60' },
    { id: 4, name: 'Salads & Health', image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60' },
    { id: 5, name: 'Desserts', image_url: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop&q=60' },
    { id: 6, name: 'Beverages', image_url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=500&auto=format&fit=crop&q=60' }
  ],
  restaurants: [
    { id: 1, owner_id: 2, name: 'The Glasshouse Bistro', description: 'Premium continental delicacies & craft mocktails with a glass-roof garden experience.', cuisine_type: 'Continental, Beverages', image_url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60', address: '12 Luxury Boulevard, Sector 4', rating: 4.8, commission_rate: 12.50, is_featured: 1, is_active: 1, latitude: 12.9780, longitude: 77.5920, delivery_zone: '[[12.97,77.58],[12.99,77.58],[12.99,77.60],[12.97,77.60]]' },
    { id: 2, owner_id: 2, name: 'Pizzeria Napoli', description: 'Authentic woodfired Neapolitan pizzas with fresh mozzarella and local organic basil.', cuisine_type: 'Italian, Pizza', image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=60', address: '45 Corso Roma, Downtown', rating: 4.6, commission_rate: 10.00, is_featured: 1, is_active: 1, latitude: 12.9730, longitude: 77.5960, delivery_zone: '[[12.965,77.585],[12.985,77.585],[12.985,77.605],[12.965,77.605]]' },
    { id: 3, owner_id: 2, name: 'Kyoto Zen Garden', description: 'Master-grade sashimi, hand-rolled sushi & warm therapeutic ramen bowls.', cuisine_type: 'Japanese, Sushi', image_url: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60', address: '88 Sakura Lane, Chinatown', rating: 4.9, commission_rate: 15.00, is_featured: 1, is_active: 1, latitude: 12.9805, longitude: 77.6010, delivery_zone: '[[12.97,77.59],[12.99,77.59],[12.99,77.61],[12.97,77.61]]' },
    { id: 4, owner_id: 2, name: 'The Green Leaf Co.', description: 'Power salads, gluten-free bowls, cold-pressed juices & vegan desserts.', cuisine_type: 'Healthy, Salads', image_url: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=60', address: '32 Wellness Drive, Parkside', rating: 4.4, commission_rate: 8.00, is_featured: 0, is_active: 1, latitude: 12.9755, longitude: 77.5855, delivery_zone: '[[12.96,77.57],[12.99,77.57],[12.99,77.60],[12.96,77.60]]' }
  ],
  menu_items: [
    { id: 1, restaurant_id: 1, category_id: 1, name: 'Truffle Umami Burger', description: 'Premium plant patty, Swiss cheese, white truffle aioli, toasted brioche bun.', price: 18.00, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 2, restaurant_id: 1, category_id: 6, name: 'Smoked Rosemary Old Fashioned', description: 'Non-alcoholic botanical extract, smoked rosemary sprig, orange rind.', price: 12.00, image_url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 3, restaurant_id: 1, category_id: 4, name: 'Avocado Quinoa Salad', description: 'Fresh Haas avocado, tri-color quinoa, baby spinach, lemon-herb vinaigrette.', price: 15.50, image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 4, restaurant_id: 2, category_id: 2, name: 'Margherita D.O.C.', description: 'San Marzano tomatoes, fresh buffalo mozzarella, extra virgin olive oil, basil.', price: 19.00, image_url: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 5, restaurant_id: 2, category_id: 2, name: 'Spicy Diablo Pepperoni', description: 'Mozzarella, cured pepperoni, hot honey drizzle, fresh jalapeños.', price: 22.50, image_url: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&auto=format&fit=crop&q=60', is_veg: 0, is_available: 1 },
    { id: 6, restaurant_id: 2, category_id: 5, name: 'Classic Tiramisu', description: 'Mascarpone cream, espresso-soaked ladyfingers, cocoa dusting.', price: 9.00, image_url: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 7, restaurant_id: 3, category_id: 3, name: 'Signature Rainbow Roll', description: 'Snow crab, avocado, topped with fresh tuna, salmon, yellowtail, and shrimp.', price: 24.00, image_url: 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&auto=format&fit=crop&q=60', is_veg: 0, is_available: 1 },
    { id: 8, restaurant_id: 3, category_id: 3, name: 'Truffle Shoyu Ramen', description: 'Slow-cooked vegetable broth, wavy noodles, soft-boiled egg, black truffle paste.', price: 19.50, image_url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 9, restaurant_id: 3, category_id: 6, name: 'Ceremonial Matcha Latte', description: 'Stone-ground matcha, oat milk, touch of organic agave syrup.', price: 7.50, image_url: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 10, restaurant_id: 4, category_id: 4, name: 'Golden Buddha Bowl', description: 'Roasted sweet potatoes, warm brown rice, chickpea crunch, tahini dressing.', price: 14.00, image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 },
    { id: 11, restaurant_id: 4, category_id: 6, name: 'Cold-pressed Green Detox', description: 'Kale, cucumber, green apple, ginger, lemon.', price: 8.00, image_url: 'https://images.unsplash.com/photo-1610970881699-44a5587caa90?w=500&auto=format&fit=crop&q=60', is_veg: 1, is_available: 1 }
  ],
  orders: [],
  order_items: [],
  coupons: [
    { id: 1, code: 'HUNGRY50', discount_percent: 50, max_discount: 20.00, min_order_value: 30.00, is_active: 1 },
    { id: 2, code: 'FREESHIP', discount_percent: 100, max_discount: 10.00, min_order_value: 15.00, is_active: 1 },
    { id: 3, code: 'WELCOME10', discount_percent: 10, max_discount: 10.00, min_order_value: 10.00, is_active: 1 }
  ],
  transactions: [],
  reviews: [
    { id: 1, user_id: 4, restaurant_id: 1, order_id: 1, rating: 5, comment: 'Absolutely spectacular! The truffle burger was cooked to perfection and the rosemary Old Fashioned was so refreshing.', created_at: new Date().toISOString() }
  ],
  notifications: [
    { id: 1, user_id: 4, title: 'Welcome to HungryHub!', message: 'Delivering happiness, one bite at a time. Start exploring premium restaurants now!', is_read: 0, created_at: new Date().toISOString() }
  ],
  wishlist: [],
  route_history: []
};

// Initialize connection
try {
  const dbUri = process.env.DATABASE_URL;
  if (dbUri) {
    pool = mysql.createPool(dbUri);
  } else {
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'hungryhub',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  // Verify connection
  const conn = await pool.getConnection();
  console.log('✅ MySQL database connected successfully.');
  conn.release();
} catch (err) {
  isFallback = true;
  console.warn('⚠️  MySQL database connection failed. Falling back to IN-MEMORY DATABASE.');
}

// In-Memory Database Query Evaluator
const evaluateMockQuery = async (sql, params = []) => {
  const queryClean = sql.replace(/\s+/g, ' ').trim();
  
  // 1. SELECT * FROM users WHERE email = ?
  if (queryClean.match(/SELECT \* FROM users WHERE email = \?/i)) {
    const email = params[0];
    const user = mockDB.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    return [user ? [user] : []];
  }

  // 2. INSERT INTO users ...
  if (queryClean.match(/INSERT INTO users/i)) {
    // INSERT INTO users (name, email, password_hash, role, phone, referral_code) VALUES (?, ?, ?, ?, ?, ?)
    const name = params[0];
    const email = params[1];
    const password_hash = params[2];
    const role = params[3] || 'customer';
    const phone = params[4] || '';
    const referral_code = params[5] || 'HH' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const newId = mockDB.users.length + 1;
    const newUser = { id: newId, name, email, password_hash, role, phone, referral_code, loyalty_points: 0, is_active: 1 };
    
    mockDB.users.push(newUser);
    // Create matching wallet
    mockDB.wallets.push({ id: mockDB.wallets.length + 1, user_id: newId, balance: 200.00 }); // Default $200 for new register!
    
    if (role === 'rider') {
      mockDB.riders.push({
        id: mockDB.riders.length + 1,
        user_id: newId,
        vehicle_number: 'HH-RIDER-' + newId,
        vehicle_type: 'E-Bike',
        status: 'offline',
        latitude: 12.971598,
        longitude: 77.594562,
        earnings: 0.0
      });
    }

    return [{ insertId: newId }];
  }

  // 3. SELECT * FROM users WHERE id = ?
  if (queryClean.match(/SELECT \* FROM users WHERE id = \?/i)) {
    const user = mockDB.users.find(u => u.id === Number(params[0]));
    return [user ? [user] : []];
  }

  // 4. SELECT * FROM wallets WHERE user_id = ?
  if (queryClean.match(/SELECT \* FROM wallets WHERE user_id = \?/i)) {
    const wallet = mockDB.wallets.find(w => w.user_id === Number(params[0]));
    return [wallet ? [wallet] : []];
  }

  // 5. UPDATE wallets SET balance = balance + ? WHERE user_id = ?
  if (queryClean.match(/UPDATE wallets SET balance = balance \+ \? WHERE user_id = \?/i)) {
    const amount = Number(params[0]);
    const userId = Number(params[1]);
    const wallet = mockDB.wallets.find(w => w.user_id === userId);
    if (wallet) {
      wallet.balance = Number((wallet.balance + amount).toFixed(2));
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 6. UPDATE wallets SET balance = ? WHERE user_id = ?
  if (queryClean.match(/UPDATE wallets SET balance = \? WHERE user_id = \?/i)) {
    const balance = Number(params[0]);
    const userId = Number(params[1]);
    const wallet = mockDB.wallets.find(w => w.user_id === userId);
    if (wallet) {
      wallet.balance = balance;
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 7. INSERT INTO transactions
  if (queryClean.match(/INSERT INTO transactions/i)) {
    const wallet_id = params[0];
    const amount = params[1];
    const type = params[2];
    const description = params[3];
    const reference_id = params[4] || null;
    const newTxId = mockDB.transactions.length + 1;
    mockDB.transactions.push({ id: newTxId, wallet_id, amount, type, description, reference_id, created_at: new Date().toISOString() });
    return [{ insertId: newTxId }];
  }

  // 8. SELECT * FROM transactions WHERE wallet_id = ?
  if (queryClean.match(/SELECT \* FROM transactions WHERE wallet_id = \?/i)) {
    const txs = mockDB.transactions.filter(t => t.wallet_id === Number(params[0]));
    return [txs];
  }

  // 9. SELECT * FROM restaurants
  if (queryClean.match(/SELECT \* FROM restaurants/i)) {
    return [mockDB.restaurants];
  }

  // 10. SELECT * FROM categories
  if (queryClean.match(/SELECT \* FROM categories/i)) {
    return [mockDB.categories];
  }

  // 11. SELECT * FROM menu_items WHERE restaurant_id = ?
  if (queryClean.match(/SELECT \* FROM menu_items WHERE restaurant_id = \?/i)) {
    const items = mockDB.menu_items.filter(i => i.restaurant_id === Number(params[0]));
    return [items];
  }

  // 12. SELECT * FROM reviews WHERE restaurant_id = ?
  if (queryClean.match(/SELECT \* FROM reviews WHERE restaurant_id = \?/i)) {
    const revs = mockDB.reviews.filter(r => r.restaurant_id === Number(params[0]));
    return [revs];
  }

  // 13. SELECT * FROM coupons WHERE code = ?
  if (queryClean.match(/SELECT \* FROM coupons WHERE code = \?/i)) {
    const coupon = mockDB.coupons.find(c => c.code === params[0]);
    return [coupon ? [coupon] : []];
  }

  // 14. INSERT INTO orders
  if (queryClean.match(/INSERT INTO orders/i)) {
    const user_id = params[0];
    const restaurant_id = params[1];
    const subtotal = params[2];
    const delivery_fee = params[3];
    const tax = params[4];
    const discount_amount = params[5];
    const payable_amount = params[6];
    const payment_method = params[7];
    const payment_status = params[8];
    const order_status = params[9] || 'placed';
    const delivery_address = params[10];
    const latitude = params[11];
    const longitude = params[12];
    const coupon_code = params[13] || null;
    const payment_id = params[14] || null;

    const newOrdId = mockDB.orders.length + 1;
    const newOrder = {
      id: newOrdId, user_id, restaurant_id, rider_id: null, subtotal, delivery_fee, tax, discount_amount, payable_amount,
      payment_method, payment_status, order_status, delivery_address, latitude, longitude, coupon_code, payment_id,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    mockDB.orders.push(newOrder);
    return [{ insertId: newOrdId }];
  }

  // 15. INSERT INTO order_items
  if (queryClean.match(/INSERT INTO order_items/i)) {
    const order_id = params[0];
    const menu_item_id = params[1];
    const quantity = params[2];
    const price = params[3];
    const newItemId = mockDB.order_items.length + 1;
    mockDB.order_items.push({ id: newItemId, order_id, menu_item_id, quantity, price });
    return [{ insertId: newItemId }];
  }

  // 16. SELECT * FROM orders WHERE user_id = ?
  if (queryClean.match(/SELECT \* FROM orders WHERE user_id = \?/i)) {
    const userOrders = mockDB.orders.filter(o => o.user_id === Number(params[0]));
    return [userOrders];
  }

  // 17. SELECT * FROM orders (all) OR filter by restaurant
  if (queryClean.match(/SELECT \* FROM orders WHERE restaurant_id = \?/i)) {
    const restOrders = mockDB.orders.filter(o => o.restaurant_id === Number(params[0]));
    return [restOrders];
  }

  if (queryClean.match(/SELECT \* FROM orders WHERE id = \?/i)) {
    const order = mockDB.orders.find(o => o.id === Number(params[0]));
    return [order ? [order] : []];
  }

  if (queryClean.match(/SELECT \* FROM orders/i)) {
    return [mockDB.orders];
  }

  // 18. UPDATE orders SET order_status = ?, rider_id = ?
  if (queryClean.match(/UPDATE orders SET order_status = \?, rider_id = \?/i)) {
    const status = params[0];
    const riderId = params[1];
    const orderId = params[2];
    const order = mockDB.orders.find(o => o.id === Number(orderId));
    if (order) {
      order.order_status = status;
      order.rider_id = riderId;
      order.updated_at = new Date().toISOString();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 19. UPDATE orders SET order_status = ?
  if (queryClean.match(/UPDATE orders SET order_status = \?/i)) {
    const status = params[0];
    const orderId = params[1];
    const order = mockDB.orders.find(o => o.id === Number(orderId));
    if (order) {
      order.order_status = status;
      order.updated_at = new Date().toISOString();
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 20. SELECT * FROM riders WHERE user_id = ?
  if (queryClean.match(/SELECT \* FROM riders WHERE user_id = \?/i)) {
    const rider = mockDB.riders.find(r => r.user_id === Number(params[0]));
    return [rider ? [rider] : []];
  }

  // 21. SELECT * FROM riders WHERE status = 'online'
  if (queryClean.match(/SELECT \* FROM riders WHERE status = 'online'/i) || queryClean.match(/SELECT \* FROM riders/i)) {
    return [mockDB.riders];
  }

  // 22. UPDATE riders SET status = ?
  if (queryClean.match(/UPDATE riders SET status = \?/i)) {
    const status = params[0];
    const userId = params[1];
    const rider = mockDB.riders.find(r => r.user_id === Number(userId));
    if (rider) {
      rider.status = status;
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 23. UPDATE riders SET latitude = ?, longitude = ?
  if (queryClean.match(/UPDATE riders SET latitude = \?, longitude = \?/i)) {
    const lat = params[0];
    const lng = params[1];
    const riderId = params[2];
    const rider = mockDB.riders.find(r => r.id === Number(riderId));
    if (rider) {
      rider.latitude = lat;
      rider.longitude = lng;
      return [{ affectedRows: 1 }];
    }
    return [{ affectedRows: 0 }];
  }

  // 24. SELECT * FROM addresses WHERE user_id = ?
  if (queryClean.match(/SELECT \* FROM addresses WHERE user_id = \?/i)) {
    return [mockDB.addresses.filter(a => a.user_id === Number(params[0]))];
  }

  // 25. INSERT INTO addresses
  if (queryClean.match(/INSERT INTO addresses/i)) {
    const user_id = params[0];
    const title = params[1];
    const address_line = params[2];
    const newAddId = mockDB.addresses.length + 1;
    mockDB.addresses.push({ id: newAddId, user_id, title, address_line, latitude: 12.97, longitude: 77.59 });
    return [{ insertId: newAddId }];
  }

  // 26. SELECT * FROM notifications WHERE user_id = ?
  if (queryClean.match(/SELECT \* FROM notifications WHERE user_id = \?/i)) {
    return [mockDB.notifications.filter(n => n.user_id === Number(params[0]))];
  }

  // 27. INSERT INTO notifications
  if (queryClean.match(/INSERT INTO notifications/i)) {
    const user_id = params[0];
    const title = params[1];
    const message = params[2];
    const newNotifId = mockDB.notifications.length + 1;
    mockDB.notifications.push({ id: newNotifId, user_id, title, message, is_read: 0, created_at: new Date().toISOString() });
    return [{ insertId: newNotifId }];
  }

  // 28. Category insertions or Restaurant updates (for Admin panel)
  if (queryClean.match(/INSERT INTO restaurants/i)) {
    const owner_id = params[0];
    const name = params[1];
    const description = params[2];
    const cuisine_type = params[3];
    const image_url = params[4];
    const address = params[5];
    const newRestId = mockDB.restaurants.length + 1;
    mockDB.restaurants.push({ id: newRestId, owner_id, name, description, cuisine_type, image_url, address, rating: 4.5, commission_rate: 10.0, is_featured: 0, is_active: 1 });
    return [{ insertId: newRestId }];
  }

  if (queryClean.match(/INSERT INTO menu_items/i)) {
    const restId = params[0];
    const catId = params[1];
    const name = params[2];
    const desc = params[3];
    const price = params[4];
    const img = params[5];
    const newMenuItemId = mockDB.menu_items.length + 1;
    mockDB.menu_items.push({ id: newMenuItemId, restaurant_id: restId, category_id: catId, name, description: desc, price: Number(price), image_url: img, is_veg: 1, is_available: 1 });
    return [{ insertId: newMenuItemId }];
  }

  if (queryClean.match(/UPDATE menu_items SET name = \?/i) || queryClean.match(/UPDATE menu_items/i)) {
    // Just mock success
    return [{ affectedRows: 1 }];
  }

  if (queryClean.match(/DELETE FROM menu_items/i)) {
    const itemId = params[0];
    mockDB.menu_items = mockDB.menu_items.filter(item => item.id !== Number(itemId));
    return [{ affectedRows: 1 }];
  }

  // 29. INSERT INTO route_history
  if (queryClean.match(/INSERT INTO route_history/i)) {
    const order_id = params[0];
    const rider_id = params[1];
    const latitude = params[2];
    const longitude = params[3];
    if (!mockDB.route_history) mockDB.route_history = [];
    const newId = mockDB.route_history.length + 1;
    mockDB.route_history.push({
      id: newId,
      order_id: Number(order_id),
      rider_id: Number(rider_id),
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      created_at: new Date().toISOString()
    });
    return [{ insertId: newId }];
  }

  // 30. SELECT * FROM route_history
  if (queryClean.match(/SELECT.*FROM route_history WHERE order_id = \?/i)) {
    const orderId = Number(params[0]);
    if (!mockDB.route_history) mockDB.route_history = [];
    const history = mockDB.route_history.filter(h => h.order_id === orderId);
    return [history];
  }

  // Fallback default
  return [[]];
};

const db = {
  query: async (sql, params) => {
    if (isFallback) {
      return await evaluateMockQuery(sql, params);
    }
    try {
      return await pool.query(sql, params);
    } catch (err) {
      console.error('❌ SQL Query Error: ', err.message);
      // Fallback in-case MySQL goes offline mid-operation
      isFallback = true;
      console.warn('⚠️  MySQL connection disrupted. Switching to IN-MEMORY fallback database.');
      return await evaluateMockQuery(sql, params);
    }
  },
  execute: async (sql, params) => {
    return await db.query(sql, params);
  },
  isMock: () => isFallback
};

export default db;
export { mockDB };
