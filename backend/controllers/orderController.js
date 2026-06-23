import db, { mockDB } from '../config/db.js';

// Validate Coupon helper
export const validateCoupon = async (req, res) => {
  const { code, amount } = req.body;
  if (!code) {
    return res.status(400).json({ error: 'Please enter a coupon code.' });
  }

  try {
    const [coupons] = await db.query('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code]);
    if (!coupons || coupons.length === 0) {
      return res.status(404).json({ isValid: false, error: 'Coupon code is invalid or expired.' });
    }

    const coupon = coupons[0];
    if (Number(amount) < Number(coupon.min_order_value)) {
      return res.status(400).json({
        isValid: false,
        error: `Minimum order value of $${coupon.min_order_value} required for this coupon.`
      });
    }

    // Calculate discount
    let discount = Number((Number(amount) * (coupon.discount_percent / 100)).toFixed(2));
    if (discount > Number(coupon.max_discount)) {
      discount = Number(coupon.max_discount);
    }

    res.status(200).json({
      isValid: true,
      discount,
      code: coupon.code,
      message: `Coupon applied! You saved $${discount}.`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Checkout/Place Order
export const checkout = async (req, res) => {
  const {
    restaurant_id,
    items,
    subtotal,
    delivery_fee,
    tax,
    discount_amount,
    payable_amount,
    payment_method,
    payment_id,
    coupon_code,
    delivery_address
  } = req.body;

  if (!restaurant_id || !items || items.length === 0 || !payable_amount || !delivery_address) {
    return res.status(400).json({ error: 'Missing required checkout information.' });
  }

  try {
    // 1. Pay with wallet deduction if applicable
    if (payment_method === 'wallet') {
      const [wallets] = await db.query('SELECT id, balance FROM wallets WHERE user_id = ?', [req.user.id]);
      if (!wallets || wallets.length === 0) {
        return res.status(404).json({ error: 'Wallet not configured for this user.' });
      }

      const wallet = wallets[0];
      if (Number(wallet.balance) < Number(payable_amount)) {
        return res.status(400).json({ error: 'Insufficient wallet balance. Please add funds.' });
      }

      // Deduct funds
      const newBal = Number((Number(wallet.balance) - Number(payable_amount)).toFixed(2));
      await db.query('UPDATE wallets SET balance = ? WHERE user_id = ?', [newBal, req.user.id]);
      await db.query('INSERT INTO transactions (wallet_id, amount, type, description) VALUES (?, ?, ?, ?)', [
        wallet.id, Number(payable_amount), 'debit', `Order payment (Card/Wallet)`
      ]);
    }

    // 2. Insert Order
    const payStatus = (payment_method === 'cod') ? 'pending' : 'completed';
    const [result] = await db.query(
      `INSERT INTO orders (user_id, restaurant_id, subtotal, delivery_fee, tax, discount_amount, payable_amount,
                           payment_method, payment_status, order_status, delivery_address, coupon_code, payment_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, restaurant_id, subtotal, delivery_fee, tax, discount_amount, payable_amount,
       payment_method, payStatus, 'placed', delivery_address, coupon_code || null, payment_id || null]
    );

    const orderId = result.insertId;

    // 3. Insert Order Items
    for (const item of items) {
      await db.query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.id || item.menu_item_id, item.quantity, item.price]
      );
    }

    // 4. Award Loyalty Points (1 point for every $2 spent)
    const pointsAwarded = Math.floor(Number(payable_amount) / 2);
    if (pointsAwarded > 0) {
      await db.query('UPDATE users SET loyalty_points = loyalty_points + ? WHERE id = ?', [pointsAwarded, req.user.id]);
    }

    // 5. Log Notification
    await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
      req.user.id,
      'Order Placed Successfully!',
      `Your order #${orderId} has been successfully placed at HungryHub. Tracking is active.`
    ]);

    // 6. Broadcast Real-Time socket change (handled in server.js, order is now placed)
    res.status(201).json({
      message: 'Order placed successfully!',
      orderId,
      loyaltyPointsAwarded: pointsAwarded
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Customer Get Order History
export const getOrderHistory = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, r.name as restaurant_name, r.image_url as restaurant_image FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.user_id = ? ORDER BY o.created_at DESC`, [req.user.id]
    );

    if (db.isMock()) {
      // Manual enrichment for mock db
      const customerOrders = mockDB.orders.filter(o => o.user_id === req.user.id);
      const enriched = customerOrders.map(o => {
        const r = mockDB.restaurants.find(rest => rest.id === o.restaurant_id);
        return {
          ...o,
          restaurant_name: r ? r.name : 'Unknown Restaurant',
          restaurant_image: r ? r.image_url : ''
        };
      });
      return res.status(200).json(enriched.reverse());
    }

    res.status(200).json(orders || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get single order details
export const getOrderDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orders[0];
    
    // Get items
    const [items] = await db.query(
      `SELECT oi.*, m.name, m.image_url FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ?`, [id]
    );

    // Enriched details
    let enrichedItems = items || [];
    let restaurant = null;
    let rider = null;

    if (db.isMock()) {
      enrichedItems = mockDB.order_items.filter(oi => oi.order_id === Number(id)).map(oi => {
        const menu = mockDB.menu_items.find(m => m.id === oi.menu_item_id);
        return {
          ...oi,
          name: menu ? menu.name : 'Delight dish',
          image_url: menu ? menu.image_url : ''
        };
      });
      restaurant = mockDB.restaurants.find(r => r.id === order.restaurant_id);
      if (order.rider_id) {
        const rDetails = mockDB.riders.find(rid => rid.id === order.rider_id);
        if (rDetails) {
          const user = mockDB.users.find(u => u.id === rDetails.user_id);
          rider = { ...rDetails, name: user ? user.name : 'Alex Rider', phone: user ? user.phone : 'Rider Phone' };
        }
      }
    } else {
      const [restRes] = await db.query('SELECT * FROM restaurants WHERE id = ?', [order.restaurant_id]);
      restaurant = restRes[0];
      if (order.rider_id) {
        const [riderRes] = await db.query(
          `SELECT r.*, u.name, u.phone FROM riders r
           JOIN users u ON r.user_id = u.id
           WHERE r.id = ?`, [order.rider_id]);
        rider = riderRes[0];
      }
    }

    res.status(200).json({
      order,
      items: enrichedItems,
      restaurant,
      rider
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Owner Get Orders
export const restaurantGetOrders = async (req, res) => {
  try {
    // Owner owns a restaurant, let's find the owner's restaurant ID
    const [rests] = await db.query('SELECT id FROM restaurants WHERE owner_id = ?', [req.user.id]);
    if (!rests || rests.length === 0) {
      return res.status(200).json([]);
    }

    const restId = rests[0].id;
    const [orders] = await db.query(
      `SELECT o.*, u.name as customer_name, u.phone as customer_phone FROM orders o
       JOIN users u ON o.user_id = u.id
       WHERE o.restaurant_id = ? ORDER BY o.created_at DESC`, [restId]
    );

    if (db.isMock()) {
      const filtered = mockDB.orders.filter(o => o.restaurant_id === restId);
      const enriched = filtered.map(o => {
        const c = mockDB.users.find(u => u.id === o.user_id);
        return {
          ...o,
          customer_name: c ? c.name : 'sarah',
          customer_phone: c ? c.phone : '+1444555'
        };
      });
      return res.status(200).json(enriched.reverse());
    }

    res.status(200).json(orders || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Owner Update Status
export const restaurantUpdateStatus = async (req, res) => {
  const { orderId, status } = req.body;
  try {
    await db.query('UPDATE orders SET order_status = ? WHERE id = ?', [status, orderId]);
    
    // Log customer notification
    const [orders] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
    if (orders && orders.length > 0) {
      const cId = orders[0].user_id;
      let msg = `Your order #${orderId} status has changed to ${status}.`;
      if (status === 'preparing') msg = `Chef has accepted your order #${orderId} and started preparing.`;
      if (status === 'ready') msg = `Order #${orderId} is ready and waiting for rider assignment!`;
      await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
        cId, `Order Update: ${status.toUpperCase()}`, msg
      ]);
    }

    res.status(200).json({ message: 'Order status updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rider Available list (ready to pickup)
export const riderGetAvailableOrders = async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT o.*, r.name as restaurant_name, r.address as restaurant_address FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.order_status = 'ready' AND o.rider_id IS NULL ORDER BY o.created_at ASC`, []
    );

    if (db.isMock()) {
      const readyOrders = mockDB.orders.filter(o => o.order_status === 'ready' && !o.rider_id);
      const enriched = readyOrders.map(o => {
        const r = mockDB.restaurants.find(rest => rest.id === o.restaurant_id);
        return {
          ...o,
          restaurant_name: r ? r.name : ' Napoli Pizzeria',
          restaurant_address: r ? r.address : '45 Corso Roma'
        };
      });
      return res.status(200).json(enriched);
    }

    res.status(200).json(orders || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rider accepts order
export const riderAcceptOrder = async (req, res) => {
  const { orderId } = req.body;
  try {
    // Find rider matching user id
    const [riders] = await db.query('SELECT id FROM riders WHERE user_id = ?', [req.user.id]);
    if (!riders || riders.length === 0) {
      return res.status(404).json({ error: 'Rider record not found.' });
    }
    const riderId = riders[0].id;

    // Update order status to out_for_delivery and assign rider
    await db.query('UPDATE orders SET order_status = \'out_for_delivery\', rider_id = ? WHERE id = ?', [
      riderId, orderId
    ]);

    // Log Notification for customer
    const [orders] = await db.query('SELECT user_id FROM orders WHERE id = ?', [orderId]);
    if (orders && orders.length > 0) {
      await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
        orders[0].user_id, 'Delivery Partner Dispatched', `Alex Rider is on the way with your order #${orderId}.`
      ]);
    }

    res.status(200).json({ message: 'Order accepted successfully. Navigate to destination.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rider completes delivery
export const riderCompleteDelivery = async (req, res) => {
  const { orderId } = req.body;
  try {
    const [riders] = await db.query('SELECT id, user_id FROM riders WHERE user_id = ?', [req.user.id]);
    const riderId = riders[0].id;

    // Fetch order details for commissions
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const order = orders[0];

    // Mark order as delivered and completed
    await db.query('UPDATE orders SET order_status = \'delivered\', payment_status = \'completed\' WHERE id = ?', [orderId]);

    // Pay Rider ($5 flat delivery fee + 10% of order value tips mock)
    const riderPayment = 5.00 + Number((order.subtotal * 0.05).toFixed(2));
    await db.query('UPDATE riders SET earnings = earnings + ? WHERE id = ?', [riderPayment, riderId]);
    
    // Add to rider's wallet
    await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [riderPayment, req.user.id]);
    
    // Wallet transaction logs
    const [wallets] = await db.query('SELECT id FROM wallets WHERE user_id = ?', [req.user.id]);
    if (wallets && wallets.length > 0) {
      await db.query('INSERT INTO transactions (wallet_id, amount, type, description, reference_id) VALUES (?, ?, ?, ?, ?)', [
        wallets[0].id, riderPayment, 'credit', `Delivery commission for order #${orderId}`, String(orderId)
      ]);
    }

    // Pay Restaurant Owner (Subtotal - commission)
    const [rests] = await db.query('SELECT owner_id, commission_rate FROM restaurants WHERE id = ?', [order.restaurant_id]);
    if (rests && rests.length > 0) {
      const ownerId = rests[0].owner_id;
      const commissionAmount = Number((order.subtotal * (rests[0].commission_rate / 100)).toFixed(2));
      const netPayment = Number((order.subtotal - commissionAmount).toFixed(2));
      
      await db.query('UPDATE wallets SET balance = balance + ? WHERE user_id = ?', [netPayment, ownerId]);
      const [oWallets] = await db.query('SELECT id FROM wallets WHERE user_id = ?', [ownerId]);
      if (oWallets && oWallets.length > 0) {
        await db.query('INSERT INTO transactions (wallet_id, amount, type, description, reference_id) VALUES (?, ?, ?, ?, ?)', [
          oWallets[0].id, netPayment, 'credit', `Pizzeria payout for order #${orderId}`, String(orderId)
        ]);
      }
    }

    // Notify Customer
    await db.query('INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)', [
      order.user_id, 'Delivered!', `Your order #${orderId} was delivered by our rider. Enjoy your meal!`
    ]);

    res.status(200).json({ message: 'Order marked as delivered. Commission payout processed.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rider gets dashboard
export const riderGetEarnings = async (req, res) => {
  try {
    const [riders] = await db.query('SELECT * FROM riders WHERE user_id = ?', [req.user.id]);
    if (!riders || riders.length === 0) {
      return res.status(404).json({ error: 'Rider stats not found.' });
    }
    const rider = riders[0];

    // Fetch order history for rider
    const [deliveries] = await db.query(
      `SELECT o.*, r.name as restaurant_name FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.rider_id = ? AND o.order_status = 'delivered' ORDER BY o.updated_at DESC`, [rider.id]
    );

    if (db.isMock()) {
      const dLogs = mockDB.orders.filter(o => o.rider_id === rider.id && o.order_status === 'delivered');
      const enriched = dLogs.map(o => {
        const r = mockDB.restaurants.find(rest => rest.id === o.restaurant_id);
        return { ...o, restaurant_name: r ? r.name : 'Glasshouse Bistro' };
      });
      return res.status(200).json({ rider, deliveries: enriched });
    }

    res.status(200).json({
      rider,
      deliveries: deliveries || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Rider availability toggle
export const riderUpdateStatus = async (req, res) => {
  const { status } = req.body; // 'online' / 'offline'
  try {
    await db.query('UPDATE riders SET status = ? WHERE user_id = ?', [status, req.user.id]);
    res.status(200).json({ message: `Rider availability set to ${status}.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
