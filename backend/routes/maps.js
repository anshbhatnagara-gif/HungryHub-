import express from 'express';
import db from '../config/db.js';

const router = express.Router();

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

// Helper: Point in Polygon (Ray-Casting Algorithm)
function isPointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng))
        && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Helper: Decode Google Polyline
function decodePolyline(encoded) {
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return points;
}

// GET /api/maps/restaurants
router.get('/restaurants', async (req, res) => {
  try {
    const [restaurants] = await db.query('SELECT id, name, latitude, longitude, cuisine_type, rating, delivery_zone FROM restaurants WHERE is_active = 1');
    res.json({ restaurants: restaurants || [] });
  } catch (err) {
    console.error('Map API Error:', err);
    res.status(500).json({ error: 'Failed to fetch restaurant locations' });
  }
});

// GET /api/maps/nearby
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 5 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Coordinates are required' });

  const customerLat = parseFloat(lat);
  const customerLng = parseFloat(lng);
  const searchRadius = parseFloat(radius);

  try {
    // Standard SELECT to support dual-mode (mock DB + MySQL)
    const [restaurants] = await db.query('SELECT * FROM restaurants WHERE is_active = 1');
    const filtered = (restaurants || []).map(r => {
      const distance = haversineDistance(customerLat, customerLng, parseFloat(r.latitude), parseFloat(r.longitude));
      return { ...r, distance: parseFloat(distance.toFixed(2)) };
    }).filter(r => r.distance <= searchRadius)
      .sort((a, b) => a.distance - b.distance);

    res.json({ restaurants: filtered });
  } catch (err) {
    console.error('Nearby API Error:', err);
    res.status(500).json({ error: 'Failed to fetch nearby restaurants' });
  }
});

// GET /api/maps/nearby-hotels
router.get('/nearby-hotels', async (req, res) => {
  const { lat, lng, radius = 5000 } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Coordinates are required' });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const searchRadius = Math.min(parseInt(radius, 10) || 5000, 10000);

  if (apiKey) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${searchRadius}&type=lodging&key=${apiKey}`;
      const googleRes = await fetch(url);
      const data = await googleRes.json();
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        const hotels = (data.results || []).slice(0, 12).map(place => ({
          id: place.place_id,
          name: place.name,
          address: place.vicinity,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          rating: place.rating || null,
          is_open: place.opening_hours?.open_now ?? null,
          type: 'hotel'
        }));
        return res.json({ hotels });
      }
    } catch (err) {
      console.warn('Google nearby hotels failed, falling back to OSM:', err.message);
    }
  }

  try {
    const delta = searchRadius / 111000;
    const viewbox = `${longitude - delta},${latitude + delta},${longitude + delta},${latitude - delta}`;
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=hotel&bounded=1&viewbox=${viewbox}&limit=12`, {
      headers: { 'User-Agent': 'HungryHub-App/1.0' }
    });
    const data = await osmRes.json();
    const hotels = (data || []).map(item => ({
      id: String(item.place_id || item.osm_id),
      name: item.name || item.display_name?.split(',')[0] || 'Hotel',
      address: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      rating: null,
      is_open: null,
      type: 'hotel'
    }));
    res.json({ hotels });
  } catch (err) {
    console.error('Nearby hotels fallback error:', err);
    res.status(500).json({ error: 'Failed to fetch nearby hotels' });
  }
});

// POST /api/maps/geocode
router.post('/geocode', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address is required' });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const googleRes = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`);
      const data = await googleRes.json();
      if (data.status === 'OK' && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        return res.json({ latitude: lat, longitude: lng });
      }
    } catch (err) {
      console.warn('Google Geocode failed, falling back to OSM:', err.message);
    }
  }

  // Fallback to OSM Nominatim
  try {
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`, {
      headers: { 'User-Agent': 'HungryHub-App/1.0' }
    });
    const data = await osmRes.json();
    if (data && data.length > 0) {
      res.json({ latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) });
    } else {
      res.status(404).json({ error: 'Location not found' });
    }
  } catch (err) {
    console.error('Geocode Fallback Error:', err);
    res.status(500).json({ error: 'Geocoding failed' });
  }
});

// POST /api/maps/autocomplete
router.post('/autocomplete', async (req, res) => {
  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Search term is required' });

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const googleRes = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`);
      const data = await googleRes.json();
      if (data.status === 'OK') {
        const suggestions = data.predictions.map(p => ({
          description: p.description,
          place_id: p.place_id
        }));
        return res.json({ suggestions });
      }
    } catch (err) {
      console.warn('Google Autocomplete failed, falling back to OSM:', err.message);
    }
  }

  // Fallback to OSM Nominatim Search
  try {
    const osmRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(input)}&limit=5`, {
      headers: { 'User-Agent': 'HungryHub-App/1.0' }
    });
    const data = await osmRes.json();
    if (data && data.length > 0) {
      const suggestions = data.map(item => ({
        description: item.display_name,
        place_id: item.place_id || String(item.osm_id)
      }));
      res.json({ suggestions });
    } else {
      res.json({ suggestions: [] });
    }
  } catch (err) {
    console.error('Autocomplete Fallback Error:', err);
    res.status(500).json({ error: 'Autocomplete failed' });
  }
});

// GET /api/maps/directions
router.get('/directions', async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query;
  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ error: 'Origin and destination coordinates are required' });
  }

  const apiKey = process.env.GOOGLE_MAPS_DIRECTIONS_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const googleRes = await fetch(`https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${apiKey}`);
      const data = await googleRes.json();
      if (data.status === 'OK' && data.routes.length > 0) {
        const route = data.routes[0];
        const decodedPoints = decodePolyline(route.overview_polyline.points);
        const leg = route.legs[0];
        return res.json({
          route: decodedPoints,
          distance: leg.distance.text,
          distanceValue: leg.distance.value, // in meters
          duration: leg.duration.text,
          durationValue: leg.duration.value // in seconds
        });
      }
    } catch (err) {
      console.warn('Google Directions failed, falling back to OSRM:', err.message);
    }
  }

  // Fallback to OSRM Driving API
  try {
    const osrmRes = await fetch(`https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`);
    const data = await osrmRes.json();
    if (data.code === 'Ok' && data.routes && data.routes[0]) {
      const routeCoords = data.routes[0].geometry.coordinates.map(coord => ({
        lat: coord[1],
        lng: coord[0]
      }));
      const distanceKm = (data.routes[0].distance / 1000).toFixed(1);
      const durationMin = Math.ceil(data.routes[0].duration / 60);
      res.json({
        route: routeCoords,
        distance: `${distanceKm} km`,
        distanceValue: data.routes[0].distance,
        duration: `${durationMin} mins`,
        durationValue: data.routes[0].duration
      });
    } else {
      // Direct linear math fallback
      const dist = haversineDistance(parseFloat(originLat), parseFloat(originLng), parseFloat(destLat), parseFloat(destLng));
      const route = [
        { lat: parseFloat(originLat), lng: parseFloat(originLng) },
        { lat: parseFloat(destLat), lng: parseFloat(destLng) }
      ];
      res.json({
        route,
        distance: `${dist.toFixed(1)} km`,
        distanceValue: dist * 1000,
        duration: `${Math.ceil(dist * 3)} mins`,
        durationValue: dist * 3 * 60
      });
    }
  } catch (err) {
    console.error('Directions Fallback Error:', err);
    res.status(500).json({ error: 'Failed to fetch directions' });
  }
});

// POST /api/maps/zones/validate
router.post('/zones/validate', async (req, res) => {
  const { restaurant_id, latitude, longitude } = req.body;
  if (!restaurant_id || !latitude || !longitude) {
    return res.status(400).json({ error: 'Restaurant ID and customer coordinates are required' });
  }

  const customerLat = parseFloat(latitude);
  const customerLng = parseFloat(longitude);

  try {
    const [rests] = await db.query('SELECT id, name, latitude, longitude, delivery_zone FROM restaurants WHERE id = ?', [restaurant_id]);
    if (!rests || rests.length === 0) {
      return res.status(404).json({ error: 'Restaurant not found' });
    }

    const rest = rests[0];
    const restLat = parseFloat(rest.latitude);
    const restLng = parseFloat(rest.longitude);

    let inZone = false;
    let zoneType = 'default';

    if (rest.delivery_zone) {
      try {
        const polygon = JSON.parse(rest.delivery_zone);
        if (Array.isArray(polygon) && polygon.length >= 3) {
          inZone = isPointInPolygon(customerLat, customerLng, polygon);
          zoneType = 'polygon';
        }
      } catch (err) {
        console.error('Delivery zone JSON parse error:', err);
      }
    }

    // Fallback: If no polygon zone exists, check Haversine distance < 10 km
    if (zoneType === 'default') {
      const distance = haversineDistance(customerLat, customerLng, restLat, restLng);
      inZone = distance <= 10.0; // 10 km limit
    }

    const distance = haversineDistance(customerLat, customerLng, restLat, restLng);

    res.json({
      inZone,
      distance: parseFloat(distance.toFixed(2)),
      message: inZone 
        ? 'Address is within the active delivery zone.' 
        : 'Out of delivery boundary. Please choose an address closer to the restaurant.'
    });
  } catch (err) {
    console.error('Zone validation error:', err);
    res.status(500).json({ error: 'Failed to validate delivery zone' });
  }
});

export default router;
