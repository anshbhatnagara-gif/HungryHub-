import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline, Polygon, HeatmapLayer, InfoWindow, MarkerClustererF } from '@react-google-maps/api';
import { MapContainer, TileLayer, Marker as LeafletMarker, Polyline as LeafletPolyline, Polygon as LeafletPolygon, Circle as LeafletCircle, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 };
const RESTAURANT_ICON = 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png';

const markerSvg = (color) => (
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><path fill="${color}" stroke="white" stroke-width="2" d="M16 2C10.5 2 6 6.5 6 12c0 7.5 10 18 10 18s10-10.5 10-18C26 6.5 21.5 2 16 2z"/><circle cx="16" cy="12" r="4" fill="white"/></svg>`
  )}`
);

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerSvg('#f97316'),
  iconRetinaUrl: markerSvg('#f97316'),
  shadowUrl: '',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const customIcon = (url) => new L.Icon({
  iconUrl: url,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3c192' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] }
];

const toFinitePoint = (point) => ({
  lat: Number.isFinite(Number(point?.lat)) ? Number(point.lat) : DEFAULT_CENTER.lat,
  lng: Number.isFinite(Number(point?.lng)) ? Number(point.lng) : DEFAULT_CENTER.lng
});

function LeafletAutoFit({ points, enabled }) {
  const leafletMap = useMap();

  useEffect(() => {
    if (!enabled || points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [Number(p.lat), Number(p.lng)]));
    leafletMap.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
  }, [enabled, leafletMap, points]);

  return null;
}

function LeafletMapFallback({
  center,
  markers,
  route,
  polygon,
  heatmap,
  userLocation,
  autoFitBounds,
  zoom,
  height,
  theme
}) {
  const mapStyles = { height, width: '100%', borderRadius: '1rem' };
  const validCenter = toFinitePoint(center);
  const validMarkers = useMemo(
    () => markers.filter((m) => Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lng))),
    [markers]
  );
  const directionOrigin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const leafletPolygonCoords = useMemo(() => {
    if (!polygon) return null;
    return polygon.map((p) => (Array.isArray(p) ? p : [p.lat, p.lng]));
  }, [polygon]);

  return (
    <div style={mapStyles} className="overflow-hidden shadow-sm relative z-0">
      <MapContainer center={[validCenter.lat, validCenter.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <LeafletAutoFit points={validMarkers} enabled={autoFitBounds} />
        <TileLayer attribution='&copy; <a href="https://carto.com/">CARTO</a>' url={tileUrl} />

        {leafletPolygonCoords && (
          <LeafletPolygon
            positions={leafletPolygonCoords}
            pathOptions={{ color: '#f97316', fillColor: '#fdba74', fillOpacity: 0.25, weight: 2 }}
          />
        )}

        {route && route.length > 0 && (
          <LeafletPolyline positions={route.map((p) => [p.lat, p.lng])} color="#f97316" weight={5} />
        )}

        {heatmap && heatmap.map((h, idx) => (
          <LeafletCircle
            key={`heat-${idx}`}
            center={[h.lat, h.lng]}
            radius={200}
            pathOptions={{ color: 'red', fillColor: '#f43f5e', fillOpacity: 0.4, stroke: false }}
          />
        ))}

        {validMarkers.map((m, idx) => {
          const icon = m.iconUrl && !m.iconUrl.includes('maps.google.com')
            ? customIcon(m.iconUrl)
            : m.id === 'user-location'
              ? customIcon(markerSvg('#2563eb'))
              : new L.Icon.Default();

          return (
            <LeafletMarker key={m.id || idx} position={[Number(m.lat), Number(m.lng)]} icon={icon}>
              {m.id !== 'user-location' && (m.name || m.address) && (
                <Popup>
                  <div className="space-y-1 text-stone-800">
                    {m.image_url && <img src={m.image_url} alt={m.name || 'Location'} className="w-36 h-20 object-cover rounded" />}
                    <strong>{m.name || 'Location'}</strong>
                    {m.address && <p>{m.address}</p>}
                    {m.distance && <p>{m.distance}</p>}
                    <a
                      href={`https://www.google.com/maps/dir/?api=1${directionOrigin ? `&origin=${directionOrigin}` : ''}&destination=${m.lat},${m.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Get Directions
                    </a>
                  </div>
                </Popup>
              )}
            </LeafletMarker>
          );
        })}
      </MapContainer>
      <div className="absolute top-2 right-2 bg-white/90 dark:bg-zinc-950/90 backdrop-blur px-2.5 py-1 rounded-xl text-[10px] font-bold text-stone-500 dark:text-stone-400 z-[1000] shadow border border-stone-200 dark:border-zinc-800">
        Using OpenStreetMap Fallback
      </div>
    </div>
  );
}

function GoogleMapView(props) {
  const {
    apiKey,
    center,
    markers,
    route,
    polygon,
    heatmap,
    userLocation,
    autoFitBounds,
    zoom,
    height,
    theme
  } = props;

  const libraries = useMemo(() => ['visualization', 'places'], []);
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries
  });

  const mapStyles = { height, width: '100%', borderRadius: '1rem' };
  const [mapError, setMapError] = useState(false);
  const [map, setMap] = useState(null);
  const [activeMarker, setActiveMarker] = useState(null);
  const validCenter = toFinitePoint(center);
  const validMarkers = useMemo(
    () => markers.filter((m) => Number.isFinite(Number(m.lat)) && Number.isFinite(Number(m.lng))),
    [markers]
  );

  useEffect(() => {
    if (loadError) setMapError(true);
  }, [loadError]);

  useEffect(() => {
    window.gm_authFailure = () => {
      console.warn('Google Maps authentication failed. Falling back to OpenStreetMap.');
      setMapError(true);
    };

    return () => {
      delete window.gm_authFailure;
    };
  }, []);

  const onLoad = useCallback((mapInstance) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  useEffect(() => {
    if (!map || !autoFitBounds || validMarkers.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    validMarkers.forEach(({ lat, lng }) => bounds.extend(new window.google.maps.LatLng(Number(lat), Number(lng))));
    map.fitBounds(bounds);

    const listener = window.google.maps.event.addListener(map, 'idle', () => {
      if (map.getZoom() > 16) map.setZoom(16);
      window.google.maps.event.removeListener(listener);
    });
  }, [autoFitBounds, map, validMarkers]);

  const googlePolygonCoords = useMemo(() => {
    if (!polygon) return null;
    return polygon.map((p) => (Array.isArray(p) ? { lat: p[0], lng: p[1] } : p));
  }, [polygon]);

  const googleHeatmapData = useMemo(() => {
    if (!heatmap || !isLoaded || !window.google?.maps) return [];
    return heatmap.map((p) => new window.google.maps.LatLng(p.lat, p.lng));
  }, [heatmap, isLoaded]);

  const directionOrigin = userLocation ? `${userLocation.lat},${userLocation.lng}` : '';

  if (mapError || loadError) {
    return <LeafletMapFallback {...props} />;
  }

  if (!isLoaded) {
    return (
      <div style={mapStyles} className="bg-stone-100 dark:bg-zinc-900 animate-pulse rounded-2xl flex items-center justify-center text-xs text-stone-400">
        Syncing Map Coordinates...
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl overflow-hidden shadow-sm">
      <GoogleMap
        mapContainerStyle={mapStyles}
        zoom={zoom}
        center={validCenter}
        options={{ disableDefaultUI: false, zoomControl: true, styles: theme === 'dark' ? darkMapStyles : [] }}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {googlePolygonCoords && (
          <Polygon
            paths={googlePolygonCoords}
            options={{ strokeColor: '#f97316', strokeOpacity: 0.8, strokeWeight: 2, fillColor: '#f97316', fillOpacity: 0.15 }}
          />
        )}

        {route && route.length > 0 && (
          <Polyline path={route} options={{ strokeColor: '#f97316', strokeOpacity: 0.95, strokeWeight: 5 }} />
        )}

        {heatmap && googleHeatmapData.length > 0 && (
          <HeatmapLayer data={googleHeatmapData} options={{ radius: 20, opacity: 0.6 }} />
        )}

        <MarkerClustererF>
          {(clusterer) => (
            <>
              {validMarkers.map((m, idx) => (
                <Marker
                  key={m.id || idx}
                  position={{ lat: Number(m.lat), lng: Number(m.lng) }}
                  icon={{
                    url: m.iconUrl || RESTAURANT_ICON,
                    scaledSize: new window.google.maps.Size(m.id === 'user-location' ? 34 : 32, m.id === 'user-location' ? 34 : 32)
                  }}
                  onClick={() => m.id !== 'user-location' && setActiveMarker(m.id)}
                  clusterer={clusterer}
                />
              ))}
            </>
          )}
        </MarkerClustererF>

        {activeMarker && (() => {
          const markerInfo = markers.find((m) => m.id === activeMarker);
          if (!markerInfo) return null;

          return (
            <InfoWindow
              position={{ lat: Number(markerInfo.lat), lng: Number(markerInfo.lng) }}
              onCloseClick={() => setActiveMarker(null)}
              options={{ pixelOffset: new window.google.maps.Size(0, -35) }}
            >
              <div className="p-1 max-w-xs text-stone-800">
                {markerInfo.image_url && <img src={markerInfo.image_url} alt={markerInfo.name} className="w-full h-24 object-cover rounded-lg mb-2 shadow-md" />}
                <h4 className="font-extrabold text-base">{markerInfo.name}</h4>
                <p className="text-xs text-stone-500 mb-1">{markerInfo.address}</p>
                <div className="flex justify-between items-center text-xs font-bold mb-2">
                  {markerInfo.rating && <span className="text-amber-600">Rating: {markerInfo.rating} stars</span>}
                  {markerInfo.distance && <span className="text-purple-600">{markerInfo.distance}</span>}
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1${directionOrigin ? `&origin=${directionOrigin}` : ''}&destination=${markerInfo.lat},${markerInfo.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-1.5 bg-blue-600 text-white font-bold text-xs rounded-md hover:bg-blue-700 transition-colors"
                >
                  Get Directions
                </a>
              </div>
            </InfoWindow>
          );
        })()}
      </GoogleMap>
    </div>
  );
}

export default function MapComponent({
  center = DEFAULT_CENTER,
  markers = [],
  route = null,
  polygon = null,
  heatmap = null,
  userLocation = null,
  autoFitBounds = false,
  zoom = 13,
  height = '400px',
  theme = 'light'
}) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const props = { center, markers, route, polygon, heatmap, userLocation, autoFitBounds, zoom, height, theme };

  if (!apiKey) {
    return <LeafletMapFallback {...props} />;
  }

  return <GoogleMapView {...props} apiKey={apiKey} />;
}
