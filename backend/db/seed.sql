USE hungryhub;

-- Clean existing data
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE wishlist;
TRUNCATE TABLE notifications;
TRUNCATE TABLE reviews;
TRUNCATE TABLE order_items;
TRUNCATE TABLE orders;
TRUNCATE TABLE transactions;
TRUNCATE TABLE wallets;
TRUNCATE TABLE menu_items;
TRUNCATE TABLE categories;
TRUNCATE TABLE restaurants;
TRUNCATE TABLE addresses;
TRUNCATE TABLE riders;
TRUNCATE TABLE users;
TRUNCATE TABLE coupons;
SET FOREIGN_KEY_CHECKS = 1;

-- Seed Users
-- Passwords are all bcrypt hashes of 'password123'
INSERT INTO users (id, name, email, password_hash, role, phone, referral_code, loyalty_points) VALUES
(1, 'Super Admin', 'admin@hungryhub.com', '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', 'admin', '+1234567890', 'ADMIN999', 1000),
(2, 'Chef Giovanni (Owner)', 'owner@hungryhub.com', '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', 'owner', '+1987654321', 'OWNER555', 0),
(3, 'Alex Rider (Delivery)', 'rider@hungryhub.com', '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', 'rider', '+1555444333', 'RIDER111', 100),
(4, 'Sarah Jenkins (Customer)', 'customer@hungryhub.com', '$2a$10$U.l19m7KjBdfjN0d1eD6Vu.w6bZ4c3sUe7O7J6lQ7Ie9W6g9m6W/y', 'customer', '+1444555666', 'SARAH444', 250);

-- Seed Wallets
INSERT INTO wallets (user_id, balance) VALUES
(1, 10000.00),
(2, 250.00),
(3, 50.00),
(4, 500.00); -- Customer starts with $500 wallet balance!

-- Seed Addresses
INSERT INTO addresses (user_id, title, address_line, latitude, longitude) VALUES
(4, 'Home', '742 Evergreen Terrace, Springfield', 12.972442, 77.590643),
(4, 'Work', '100 Infinity Loop, Cupertino', 12.981267, 77.601552);

-- Seed Riders details
INSERT INTO riders (user_id, vehicle_number, vehicle_type, status, latitude, longitude, earnings) VALUES
(3, 'KA-03-EX-1234', 'Electric Scooter', 'online', 12.971598, 77.594562, 120.50);

-- Seed Categories
INSERT INTO categories (id, name, image_url) VALUES
(1, 'Burgers', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60'),
(2, 'Pizzas', 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60'),
(3, 'Sushi & Asian', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=500&auto=format&fit=crop&q=60'),
(4, 'Salads & Health', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&auto=format&fit=crop&q=60'),
(5, 'Desserts', 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=500&auto=format&fit=crop&q=60'),
(6, 'Beverages', 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=500&auto=format&fit=crop&q=60');

-- Seed Restaurants
INSERT INTO restaurants (id, owner_id, name, description, cuisine_type, image_url, address, rating, commission_rate, is_featured) VALUES
(1, 2, 'The Glasshouse Bistro', 'Premium continental delicacies & craft mocktails with a glass-roof garden experience.', 'Continental, Beverages', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=60', '12 Luxury Boulevard, Sector 4', 4.8, 12.50, TRUE),
(2, 2, 'Pizzeria Napoli', 'Authentic woodfired Neapolitan pizzas with fresh mozzarella and local organic basil.', 'Italian, Pizza', 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&auto=format&fit=crop&q=60', '45 Corso Roma, Downtown', 4.6, 10.00, TRUE),
(3, 2, 'Kyoto Zen Garden', 'Master-grade sashimi, hand-rolled sushi & warm therapeutic ramen bowls.', 'Japanese, Sushi', 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&auto=format&fit=crop&q=60', '88 Sakura Lane, Chinatown', 4.9, 15.00, TRUE),
(4, 2, 'The Green Leaf Co.', 'Power salads, gluten-free bowls, cold-pressed juices & vegan desserts.', 'Healthy, Salads', 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&auto=format&fit=crop&q=60', '32 Wellness Drive, Parkside', 4.4, 8.00, FALSE);

-- Seed Menu Items
INSERT INTO menu_items (restaurant_id, category_id, name, description, price, image_url, is_veg, is_available) VALUES
-- The Glasshouse Bistro (Rest ID 1)
(1, 1, 'Truffle Umami Burger', 'Premium plant patty, Swiss cheese, white truffle aioli, toasted brioche bun.', 18.00, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),
(1, 6, 'Smoked Rosemary Old Fashioned', 'Non-alcoholic botanical extract, smoked rosemary sprig, orange rind.', 12.00, 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),
(1, 4, 'Avocado Quinoa Salad', 'Fresh Haas avocado, tri-color quinoa, baby spinach, lemon-herb vinaigrette.', 15.50, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),

-- Pizzeria Napoli (Rest ID 2)
(2, 2, 'Margherita D.O.C.', 'San Marzano tomatoes, fresh buffalo mozzarella, extra virgin olive oil, basil.', 19.00, 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),
(2, 2, 'Spicy Diablo Pepperoni', 'Mozzarella, cured pepperoni, hot honey drizzle, fresh jalapeños.', 22.50, 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=500&auto=format&fit=crop&q=60', FALSE, TRUE),
(2, 5, 'Classic Tiramisu', 'Mascarpone cream, espresso-soaked ladyfingers, cocoa dusting.', 9.00, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),

-- Kyoto Zen Garden (Rest ID 3)
(3, 3, 'Signature Rainbow Roll', 'Snow crab, avocado, topped with fresh tuna, salmon, yellowtail, and shrimp.', 24.00, 'https://images.unsplash.com/photo-1611143669185-af224c5e3252?w=500&auto=format&fit=crop&q=60', FALSE, TRUE),
(3, 3, 'Truffle Shoyu Ramen', 'Slow-cooked vegetable broth, wavy noodles, soft-boiled egg, black truffle paste.', 19.50, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),
(3, 6, 'Ceremonial Matcha Latte', 'Stone-ground matcha, oat milk, touch of organic agave syrup.', 7.50, 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),

-- The Green Leaf Co. (Rest ID 4)
(4, 4, 'Golden Buddha Bowl', 'Roasted sweet potatoes, warm brown rice, chickpea crunch, tahini dressing.', 14.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60', TRUE, TRUE),
(4, 6, 'Cold-pressed Green Detox', 'Kale, cucumber, green apple, ginger, lemon.', 8.00, 'https://images.unsplash.com/photo-1610970881699-44a5587caa90?w=500&auto=format&fit=crop&q=60', TRUE, TRUE);

-- Seed Coupons
INSERT INTO coupons (code, discount_percent, max_discount, min_order_value, expiry_date, is_active) VALUES
('HUNGRY50', 50, 20.00, 30.00, '2027-12-31', TRUE),
('FREESHIP', 100, 10.00, 15.00, '2027-12-31', TRUE),
('WELCOME10', 10, 10.00, 10.00, '2027-12-31', TRUE);

-- Seed Reviews
INSERT INTO reviews (user_id, restaurant_id, order_id, rating, comment) VALUES
(4, 1, 1, 5, 'Absolutely spectacular! The truffle burger was cooked to perfection and the rosemary Old Fashioned was so refreshing.');

-- Seed Notifications
INSERT INTO notifications (user_id, title, message) VALUES
(4, 'Welcome to HungryHub!', 'Delivering happiness, one bite at a time. Start exploring premium restaurants now!'),
(4, 'Referral Bonus Available', 'Share your referral code SARAH444 and get $10 when your friends place their first order.');
