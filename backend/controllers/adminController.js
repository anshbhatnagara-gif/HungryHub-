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

// Helper: Haversine distance (in km)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Get Admin Map Analytics & Heatmaps
export const getAdminMapAnalytics = async (req, res) => {
  try {
    let activeRiders = [];
    let heatmapOrders = [];
    let avgDeliveryTime = 25; // default in minutes
    let avgDeliveryDistance = 3.5; // default in km

    if (db.isMock()) {
      // 1. Active riders
      const onlineRiders = mockDB.riders.filter(r => r.status === 'online');
      activeRiders = onlineRiders.map(r => {
        const u = mockDB.users.find(usr => usr.id === r.user_id);
        const activeOrder = mockDB.orders.find(o => o.rider_id === r.id && o.order_status === 'out_for_delivery');
        return {
          id: r.id,
          user_id: r.user_id,
          vehicle_number: r.vehicle_number,
          vehicle_type: r.vehicle_type,
          status: r.status,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          earnings: r.earnings,
          rider_name: u ? u.name : 'Alex Rider',
          rider_phone: u ? u.phone : '+1555444333',
          active_order_id: activeOrder ? activeOrder.id : null
        };
      });

      // 2. Heatmap coordinates
      heatmapOrders = mockDB.orders
        .filter(o => o.latitude && o.longitude)
        .map(o => ({
          id: o.id,
          latitude: Number(o.latitude),
          longitude: Number(o.longitude),
          payable_amount: o.payable_amount,
          order_status: o.order_status
        }));

      // 3. Operations metrics
      const deliveredOrders = mockDB.orders.filter(o => o.order_status === 'delivered');
      if (deliveredOrders.length > 0) {
        // Calculate average time in minutes (mock: random between 15 and 35)
        avgDeliveryTime = Math.round(
          deliveredOrders.reduce((sum, o) => {
            const start = new Date(o.created_at).getTime();
            const end = new Date(o.updated_at).getTime();
            const diffMin = Math.max(5, Math.round((end - start) / 60000));
            return sum + (isNaN(diffMin) ? 22 : diffMin);
          }, 0) / deliveredOrders.length
        );

        // Calculate average distance
        let totalDist = 0;
        let countDist = 0;
        deliveredOrders.forEach(o => {
          const r = mockDB.restaurants.find(rest => rest.id === o.restaurant_id);
          if (r && o.latitude && o.longitude) {
            totalDist += haversineDistance(
              Number(r.latitude), Number(r.longitude),
              Number(o.latitude), Number(o.longitude)
            );
            countDist++;
          }
        });
        if (countDist > 0) {
          avgDeliveryDistance = Number((totalDist / countDist).toFixed(2));
        }
      }
    } else {
      // SQL execution
      // 1. Active riders
      const [riders] = await db.query(
        `SELECT r.*, u.name as rider_name, u.phone as rider_phone,
                (SELECT id FROM orders WHERE rider_id = r.id AND order_status = 'out_for_delivery' LIMIT 1) as active_order_id
         FROM riders r
         JOIN users u ON r.user_id = u.id
         WHERE r.status = 'online'`, []
      );
      activeRiders = (riders || []).map(r => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        active_order_id: r.active_order_id
      }));

      // 2. Heatmap coordinates
      const [orders] = await db.query(
        `SELECT id, latitude, longitude, payable_amount, order_status FROM orders
         WHERE latitude IS NOT NULL AND longitude IS NOT NULL`, []
      );
      heatmapOrders = (orders || []).map(o => ({
        ...o,
        latitude: Number(o.latitude),
        longitude: Number(o.longitude)
      }));

      // 3. Operations metrics (Avg delivery time)
      const [timeRes] = await db.query(
        `SELECT AVG(TIMESTAMPDIFF(MINUTE, created_at, updated_at)) as avg_time 
         FROM orders WHERE order_status = 'delivered'`, []
      );
      if (timeRes && timeRes[0] && timeRes[0].avg_time) {
        avgDeliveryTime = Math.round(Number(timeRes[0].avg_time));
      }

      // Calculate avg distance from database records
      const [coordsRes] = await db.query(
        `SELECT o.latitude as o_lat, o.longitude as o_lng, r.latitude as r_lat, r.longitude as r_lng 
         FROM orders o
         JOIN restaurants r ON o.restaurant_id = r.id
         WHERE o.latitude IS NOT NULL AND o.longitude IS NOT NULL AND o.order_status = 'delivered'`, []
      );
      if (coordsRes && coordsRes.length > 0) {
        let totalDist = 0;
        coordsRes.forEach(c => {
          totalDist += haversineDistance(
            Number(c.r_lat), Number(c.r_lng),
            Number(c.o_lat), Number(c.o_lng)
          );
        });
        avgDeliveryDistance = Number((totalDist / coordsRes.length).toFixed(2));
      }
    }

    res.status(200).json({
      activeRiders,
      heatmapOrders,
      metrics: {
        avgDeliveryTime: avgDeliveryTime || 22,
        avgDeliveryDistance: avgDeliveryDistance || 3.8
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
