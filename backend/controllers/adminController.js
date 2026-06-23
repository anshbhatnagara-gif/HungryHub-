import db, { mockDB } from '../config/db.js';

// Get Admin Metrics
export const getAdminMetrics = async (req, res) => {
  try {
    let usersCount = 0;
    let restCount = 0;
    let ordersCount = 0;
    let totalRevenue = 0.00;
    let commissionsEarned = 0.00;

    if (db.isMock()) {
      usersCount = mockDB.users.length;
      restCount = mockDB.restaurants.length;
      ordersCount = mockDB.orders.length;
      totalRevenue = mockDB.orders.reduce((sum, o) => sum + Number(o.payable_amount), 0);
      commissionsEarned = mockDB.orders.reduce((sum, o) => {
        const r = mockDB.restaurants.find(rest => rest.id === o.restaurant_id);
        const rate = r ? r.commission_rate : 10.00;
        return sum + (Number(o.subtotal) * (rate / 100));
      }, 0);
    } else {
      const [uRes] = await db.query('SELECT COUNT(*) as count FROM users');
      usersCount = uRes[0].count;

      const [rRes] = await db.query('SELECT COUNT(*) as count FROM restaurants');
      restCount = rRes[0].count;

      const [oRes] = await db.query('SELECT COUNT(*) as count, SUM(payable_amount) as total, SUM(subtotal * 0.1) as commission FROM orders');
      ordersCount = oRes[0].count || 0;
      totalRevenue = oRes[0].total || 0;
      commissionsEarned = oRes[0].commission || 0;
    }

    res.status(200).json({
      totalUsers: usersCount,
      totalRestaurants: restCount,
      totalOrders: ordersCount,
      totalSales: Number(Number(totalRevenue).toFixed(2)),
      totalCommission: Number(Number(commissionsEarned).toFixed(2))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get monthly revenue chart dataset
export const getRevenueChartData = async (req, res) => {
  try {
    // Generate monthly sales charts
    const monthlyData = [
      { name: 'Jan', Sales: 4000, Revenue: 400 },
      { name: 'Feb', Sales: 5500, Revenue: 550 },
      { name: 'Mar', Sales: 7800, Revenue: 780 },
      { name: 'Apr', Sales: 11000, Revenue: 1100 },
      { name: 'May', Sales: 14500, Revenue: 1450 },
      { name: 'Jun', Sales: 18900, Revenue: 1890 }
    ];
    res.status(200).json(monthlyData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Manage Users (View all users + Toggle user activity state)
export const getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, email, role, phone, is_active, created_at FROM users', []);
    res.status(200).json(users || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const toggleUserStatus = async (req, res) => {
  const { userId, is_active } = req.body;
  try {
    await db.query('UPDATE users SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, userId]);
    res.status(200).json({ message: 'User status updated successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// CRUD Coupons
export const getCoupons = async (req, res) => {
  try {
    const [coupons] = await db.query('SELECT * FROM coupons ORDER BY created_at DESC', []);
    res.status(200).json(coupons || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const createCoupon = async (req, res) => {
  const { code, discount_percent, max_discount, min_order_value, expiry_date } = req.body;
  
  if (!code || !discount_percent || !max_discount || !min_order_value || !expiry_date) {
    return res.status(400).json({ error: 'Please enter all coupon parameters.' });
  }

  try {
    if (db.isMock()) {
      mockDB.coupons.push({
        id: mockDB.coupons.length + 1,
        code,
        discount_percent: Number(discount_percent),
        max_discount: Number(max_discount),
        min_order_value: Number(min_order_value),
        expiry_date,
        is_active: 1
      });
      return res.status(201).json({ message: 'Coupon created successfully!' });
    }

    await db.query(
      `INSERT INTO coupons (code, discount_percent, max_discount, min_order_value, expiry_date)
       VALUES (?, ?, ?, ?, ?)`,
      [code, discount_percent, max_discount, min_order_value, expiry_date]
    );
    res.status(201).json({ message: 'Coupon created successfully!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Toggle Coupon
export const toggleCouponStatus = async (req, res) => {
  const { id, is_active } = req.body;
  try {
    await db.query('UPDATE coupons SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, id]);
    res.status(200).json({ message: 'Coupon active status toggled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Export Reports (PDF/CSV data)
export const exportReport = async (req, res) => {
  try {
    const [orders] = await db.query('SELECT * FROM orders', []);
    
    // Construct simple CSV string
    let csv = 'Order ID,User ID,Restaurant ID,Payable Amount,Payment Method,Payment Status,Order Status,Placed Date\n';
    orders.forEach(o => {
      csv += `${o.id},${o.user_id},${o.restaurant_id},${o.payable_amount},${o.payment_method},${o.payment_status},${o.order_status},${o.created_at}\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('hungryhub_orders_report.csv');
    res.status(200).send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
