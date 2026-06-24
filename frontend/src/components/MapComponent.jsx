import React, { useState, useEffect, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Polygon, HeatmapLayer } from '@react-google-maps/api';
import { MapContainer, TileLayer, Marker as LeafletMarker, Polyline as LeafletPolyline, Polygon as LeafletPolygon, Circle as LeafletCircle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet default icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Custom Icons for Riders, Customer, and Restaurants
const customIcon = (url) => new L.Icon({
  iconUrl: url,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bangalore

const darkMapStyles = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#6b9a76" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3c192" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] }
];

export default function MapComponent({ 
  center = DEFAULT_CENTER, 
  markers = [], 
  route = null, 
  polygon = null, // array of {lat, lng} or [lat, lng]
  heatmap = null, // array of {lat, lng} for admin analytics
  zoom = 13, 
  height = "400px",
  theme = "light" // "light" or "dark"
}) {
  const libraries = useMemo(() => ['visualization'], []);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
    libraries
  });

  const mapStyles = {
    height: height,
    width: "100%",
    borderRadius: "1rem"
  };

  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (loadError) setMapError(true);
  }, [loadError]);

  // Handle Google Maps specific auth errors (restricted key, billing issues)
  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn("Google Maps authentication failed. Falling back to OpenStreetMap.");
      setMapError(true);
    };
  }, []);

  const showFallback = mapError || !import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Format polygon coordinates for Leaflet vs Google Maps
  const leafletPolygonCoords = useMemo(() => {
    if (!polygon) return null;
    return polygon.map(p => {
      if (Array.isArray(p)) return p; // [lat, lng]
      return [p.lat, p.lng];
    });
  }, [polygon]);

  const googlePolygonCoords = useMemo(() => {
    if (!polygon) return null;
    return polygon.map(p => {
      if (Array.isArray(p)) return { lat: p[0], lng: p[1] };
      return p; // {lat, lng}
    });
  }, [polygon]);

  // Google Maps Heatmap formatting
  const googleHeatmapData = useMemo(() => {
    if (!heatmap || !isLoaded) return [];
    return heatmap.map(p => new window.google.maps.LatLng(p.lat, p.lng));
  }, [heatmap, isLoaded]);

  if (showFallback) {
    const tileUrl = theme === 'dark'
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

    return (
      <div style={mapStyles} className="overflow-hidden shadow-sm relative z-0">
        <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url={tileUrl}
          />
          
          {/* Polygon delivery zones */}
          {leafletPolygonCoords && (
            <LeafletPolygon 
              positions={leafletPolygonCoords} 
              pathOptions={{
                color: '#f97316',
                fillColor: '#fdba74',
                fillOpacity: 0.25,
                weight: 2
              }}
            />
          )}

          {/* Route path */}
          {route && route.length > 0 && (
            <LeafletPolyline 
              positions={route.map(p => [p.lat, p.lng])} 
              color="#f97316" 
              weight={5} 
            />
          )}

          {/* Heatmap overlay markers fallback */}
          {heatmap && heatmap.map((h, idx) => (
            <LeafletCircle 
              key={`heat-${idx}`}
              center={[h.lat, h.lng]}
              radius={200}
              pathOptions={{
                color: 'red',
                fillColor: '#f43f5e',
                fillOpacity: 0.4,
                stroke: false
              }}
            />
          ))}

          {/* Location pins */}
          {markers.map((m, idx) => (
            <LeafletMarker 
              key={idx} 
              position={[m.lat, m.lng]} 
              icon={m.iconUrl ? customIcon(m.iconUrl) : new L.Icon.Default()} 
            />
          ))}
        </MapContainer>
        <div className="absolute top-2 right-2 bg-white/90 dark:bg-zinc-950/90 backdrop-blur px-2.5 py-1 rounded-xl text-[10px] font-bold text-stone-500 dark:text-stone-400 z-[1000] shadow border border-stone-150 dark:border-zinc-800">
          Using OpenStreetMap Fallback
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div style={mapStyles} className="bg-stone-150 dark:bg-zinc-900 animate-pulse rounded-2xl flex items-center justify-center text-xs text-stone-400">
        Syncing Map Coordinates...
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm">
      <GoogleMap
        mapContainerStyle={mapStyles}
        zoom={zoom}
        center={center}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          styles: theme === 'dark' ? darkMapStyles : []
        }}
      >
        {/* Render Delivery Zone Polygon */}
        {googlePolygonCoords && (
          <Polygon
            paths={googlePolygonCoords}
            options={{
              strokeColor: "#f97316",
              strokeOpacity: 0.8,
              strokeWeight: 2,
              fillColor: "#f97316",
              fillOpacity: 0.15,
            }}
          />
        )}

        {/* Render Directions Polyline */}
        {route && route.length > 0 && (
          <Polyline
            path={route}
            options={{
              strokeColor: "#f97316",
              strokeOpacity: 0.95,
              strokeWeight: 5,
            }}
          />
        )}

        {/* Render Heatmap Layer */}
        {heatmap && googleHeatmapData.length > 0 && (
          <HeatmapLayer
            data={googleHeatmapData}
            options={{
              radius: 20,
              opacity: 0.6
            }}
          />
        )}

        {/* Location Markers */}
        {markers.map((m, idx) => (
          <Marker 
            key={idx} 
            position={{ lat: m.lat, lng: m.lng }} 
            icon={m.iconUrl ? { url: m.iconUrl, scaledSize: new window.google.maps.Size(32, 32) } : undefined}
          />
        ))}
      </GoogleMap>
    </div>
  );
}

