const API_URL = process.env.VERIFY_API_URL || 'http://localhost:5000';
const SHOULD_RESTART_BACKEND = process.env.VERIFY_RESTART_BACKEND === 'true';

const state = {
  customerToken: '',
  ownerToken: '',
  riderToken: '',
  adminToken: '',
  restaurantId: null,
  menuItemId: null,
  deletedMenuItemId: null,
  orderId: null,
  email: `verify_${Date.now()}@hungryhub.local`,
  password: 'VerifyPass123!'
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function waitForHealthy() {
  for (let attempt = 1; attempt <= 30; attempt += 1) {
    try {
      const health = await request('/api/health');
      if (health?.database?.isMock === false) return health;
      throw new Error(`database is mock: ${JSON.stringify(health.database)}`);
    } catch (err) {
      if (attempt === 30) throw err;
      await sleep(2000);
    }
  }
}

async function login(email, password) {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { email, password }
  });
  return data.token;
}

async function restartBackend() {
  const { execFile } = await import('node:child_process');
  await new Promise((resolve, reject) => {
    execFile('docker', ['compose', 'restart', 'backend'], { cwd: process.cwd() }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`docker compose restart backend failed: ${stderr || error.message}`));
        return;
      }
      process.stdout.write(stdout);
      resolve();
    });
  });
}

async function main() {
  const results = [];
  const step = async (name, fn) => {
    const value = await fn();
    results.push({ name, status: 'PASS' });
    console.log(`PASS ${name}`);
    return value;
  };

  await step('health uses real MySQL', waitForHealthy);

  const registered = await step('register user', () => request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'Verification Customer',
      email: state.email,
      password: state.password,
      phone: '+10000000001',
      address: 'Verification Street'
    }
  }));
  state.customerToken = registered.token;

  state.customerToken = await step('login user', () => login(state.email, state.password));
  state.ownerToken = await step('login owner', () => login('owner@hungryhub.com', 'password123'));
  state.riderToken = await step('login rider', () => login('rider@hungryhub.com', 'password123'));
  state.adminToken = await step('login admin', () => login('admin@hungryhub.com', 'password123'));

  await step('google login dev flow', () => request('/api/auth/google-login', {
    method: 'POST',
    body: { credential: 'google_mock_secret' }
  }));

  const restaurant = await step('add restaurant', () => request('/api/restaurants', {
    method: 'POST',
    token: state.ownerToken,
    body: {
      name: `Verification Kitchen ${Date.now()}`,
      description: 'Automated real MySQL verification restaurant',
      cuisine_type: 'Verification',
      image_url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800',
      address: 'Verification Avenue',
      latitude: 12.971598,
      longitude: 77.594562,
      delivery_zone: JSON.stringify([[12.96, 77.58], [12.99, 77.58], [12.99, 77.61], [12.96, 77.61]])
    }
  }));
  state.restaurantId = restaurant.id;

  const menuItem = await step('add menu item', () => request(`/api/restaurants/${state.restaurantId}/menu`, {
    method: 'POST',
    token: state.ownerToken,
    body: {
      category_id: 1,
      name: 'Verification Bowl',
      description: 'Persistence test item',
      price: 12.5,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      is_veg: 1
    }
  }));
  state.menuItemId = menuItem.id;

  await step('update menu item', () => request(`/api/restaurants/${state.restaurantId}/menu/${state.menuItemId}`, {
    method: 'PUT',
    token: state.ownerToken,
    body: {
      category_id: 1,
      name: 'Verification Bowl Updated',
      description: 'Persistence test item updated',
      price: 13.25,
      image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500',
      is_veg: 1,
      is_available: 1
    }
  }));

  const deletedItem = await step('add disposable menu item', () => request(`/api/restaurants/${state.restaurantId}/menu`, {
    method: 'POST',
    token: state.ownerToken,
    body: {
      category_id: 1,
      name: 'Disposable Verification Item',
      description: 'Delete test item',
      price: 5,
      is_veg: 1
    }
  }));
  state.deletedMenuItemId = deletedItem.id;

  await step('delete menu item', () => request(`/api/restaurants/${state.restaurantId}/menu/${state.deletedMenuItemId}`, {
    method: 'DELETE',
    token: state.ownerToken
  }));

  await step('wallet transaction', () => request('/api/auth/wallet/add', {
    method: 'POST',
    token: state.customerToken,
    body: { amount: 20 }
  }));

  await step('wishlist add', () => request('/api/restaurants/wishlist/toggle', {
    method: 'POST',
    token: state.customerToken,
    body: { restaurant_id: state.restaurantId }
  }));

  await step('wishlist remove', () => request('/api/restaurants/wishlist/toggle', {
    method: 'POST',
    token: state.customerToken,
    body: { restaurant_id: state.restaurantId }
  }));

  const order = await step('place order', () => request('/api/orders/checkout', {
    method: 'POST',
    token: state.customerToken,
    body: {
      restaurant_id: state.restaurantId,
      items: [{ id: state.menuItemId, quantity: 1, price: 13.25 }],
      subtotal: 13.25,
      delivery_fee: 2,
      tax: 1,
      discount_amount: 0,
      payable_amount: 16.25,
      payment_method: 'wallet',
      delivery_address: 'Verification Street',
      latitude: 12.972,
      longitude: 77.595
    }
  }));
  state.orderId = order.orderId;

  await step('owner dashboard orders', () => request('/api/orders/restaurant/list', {
    token: state.ownerToken
  }));

  await step('owner marks order ready', async () => {
    await request('/api/orders/restaurant/status', {
      method: 'POST',
      token: state.ownerToken,
      body: { orderId: state.orderId, status: 'preparing' }
    });
    return request('/api/orders/restaurant/status', {
      method: 'POST',
      token: state.ownerToken,
      body: { orderId: state.orderId, status: 'ready' }
    });
  });

  await step('rider dashboard available orders', () => request('/api/orders/rider/available', {
    token: state.riderToken
  }));

  await step('rider accepts order', () => request('/api/orders/rider/accept', {
    method: 'POST',
    token: state.riderToken,
    body: { orderId: state.orderId }
  }));

  await step('rider completes order', () => request('/api/orders/rider/complete', {
    method: 'POST',
    token: state.riderToken,
    body: { orderId: state.orderId }
  }));

  await step('order tracking details', () => request(`/api/orders/${state.orderId}`, {
    token: state.customerToken
  }));

  await step('admin dashboard metrics', () => request('/api/admin/metrics', {
    token: state.adminToken
  }));

  await step('admin dashboard users', () => request('/api/admin/users', {
    token: state.adminToken
  }));

  await step('admin map analytics', () => request('/api/admin/map-analytics', {
    token: state.adminToken
  }));

  await step('maps restaurant list', () => request('/api/maps/restaurants'));
  await step('maps nearby restaurants', () => request('/api/maps/nearby?lat=12.971598&lng=77.594562&radius=10'));
  await step('maps delivery zone validation', () => request('/api/maps/zones/validate', {
    method: 'POST',
    body: { restaurant_id: state.restaurantId, latitude: 12.972, longitude: 77.595 }
  }));

  if (SHOULD_RESTART_BACKEND) {
    await step('restart backend container', restartBackend);
    await step('health after backend restart', waitForHealthy);
    await step('login user after restart', () => login(state.email, state.password));
    await step('verify order persisted after restart', () => request(`/api/orders/${state.orderId}`, {
      token: state.customerToken
    }));
  }

  console.log(JSON.stringify({ status: 'PASS', apiUrl: API_URL, checks: results }, null, 2));
}

main().catch((err) => {
  console.error(`FAIL ${err.message}`);
  process.exit(1);
});
