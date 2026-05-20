import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { API_BASE_URL } from './src/constants';

/* ==================== ICONOS TRANSPORTE ==================== */
const TRANSPORT_ICONS: Record<string, string> = {
  walking: '🚶', bicycle: '🚲', scooter: '🛴', skateboard: '🛹',
};
const TRANSPORT_LABELS: Record<string, string> = {
  walking: 'Andando', bicycle: 'Bicicleta', scooter: 'Patinete', skateboard: 'Monopatín',
};
/* ==================== FIN ICONOS TRANSPORTE ==================== */

export default function App() {
  /* ==================== ESTADOS ==================== */
  const [userLocation, setUserLocation] = useState<any>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [transportMode, setTransportMode] = useState('bicycle');
  const [preference, setPreference] = useState('eco_fast');
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [editingField, setEditingField] = useState<'origin' | 'dest'>('origin');
  /* ==================== FIN ESTADOS ==================== */

  const searchTimeout = useRef<any>(null);

  /* ==================== EFECTOS ==================== */
  useEffect(() => {
    getLocation();
    if (Platform.OS === 'web') loadLeaflet();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && (window as any).__leafletMap) {
      updateMarkers();
          (window as any).__currentOrigin = origin;
    (window as any).__currentDest = destination;
    }
  }, [origin, destination]);

  useEffect(() => {
    if (showResults && origin && destination) {
      calculateRoute();
    }
  }, [transportMode, preference]);
  /* ==================== FIN EFECTOS ==================== */

  /* ==================== MAPA LEAFLET ==================== */
  const loadLeaflet = () => {
    if ((window as any).L) return initMap();
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = initMap;
    document.head.appendChild(script);
  };

  const initMap = () => {
    const L = (window as any).L;
    const container = document.getElementById('leaflet-map');
    if (!container || (window as any).__mapInit) return;
    (window as any).__mapInit = true;
    const map = L.map('leaflet-map').setView([39.4699, -0.3763], 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      referrerPolicy: 'strict-origin-when-cross-origin'
    }).addTo(map);

    map.on('click', (e: any) => {
      const coord = { latitude: e.latlng.lat, longitude: e.latlng.lng };
      // Leer los valores actuales de las variables globales
      const currentOrigin = (window as any).__currentOrigin;
      const currentDest = (window as any).__currentDest;
      
      if (!currentOrigin) {
        setOrigin(coord);
        setOriginSearch(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
        (window as any).__currentOrigin = coord;
        setEditingField('dest');
      } else if (!currentDest) {
        setDestination(coord);
        setDestSearch(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
        (window as any).__currentDest = coord;
      } else {
        setDestination(coord);
        setDestSearch(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
        (window as any).__currentDest = coord;
      }
    });

    (window as any).__leafletMap = map;
    (window as any).__originMarker = null;
    (window as any).__currentOrigin = null;
(window as any).__currentDest = null;
    (window as any).__destMarker = null;
  };

  const updateMarkers = () => {
    const L = (window as any).L;
    const map = (window as any).__leafletMap;
    if (!map || !L) return;
    const redIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
    const greenIcon = L.icon({ iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41] });
    if (origin) {
      if (!(window as any).__originMarker) (window as any).__originMarker = L.marker([origin.latitude, origin.longitude], { icon: greenIcon }).addTo(map).bindPopup('🟢 Origen');
      else (window as any).__originMarker.setLatLng([origin.latitude, origin.longitude]);
    }
    if (destination) {
      if (!(window as any).__destMarker) (window as any).__destMarker = L.marker([destination.latitude, destination.longitude], { icon: redIcon }).addTo(map).bindPopup('🔴 Destino');
      else (window as any).__destMarker.setLatLng([destination.latitude, destination.longitude]);
    }
  };
  /* ==================== FIN MAPA ==================== */

  /* ==================== GEOLOCALIZACIÓN ==================== */
  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);
    setOrigin(coords);
    setOriginSearch('Mi ubicación');
  };
  /* ==================== FIN GEOLOCALIZACIÓN ==================== */

  /* ==================== BÚSQUEDA CON NOMINATIM ==================== */
  const handleSearchInput = (text: string, field: 'origin' | 'dest') => {
    if (field === 'origin') setOriginSearch(text);
    else setDestSearch(text);
    setEditingField(field);
    if (text.length < 3) { setSuggestions([]); setShowSuggestions(false); return; }
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchNominatim(text), 300);
  };

  const searchNominatim = async (query: string) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&bounded=1&viewbox=-0.45,39.42,-0.30,39.50&limit=5`;
      const res = await fetch(url);
      const data = await res.json();
      if (!Array.isArray(data)) { setSuggestions([]); setShowSuggestions(false); return; }
      setSuggestions(data.map((item: any) => ({ name: item.display_name, lat: parseFloat(item.lat), lon: parseFloat(item.lon) })));
      setShowSuggestions(data.length > 0);
    } catch (e) { setSuggestions([]); setShowSuggestions(false); }
  };

  const selectSuggestion = (item: any) => {
    const coords = { latitude: item.lat, longitude: item.lon };
    const shortName = item.name.split(',').slice(0, 2).join(',');
    if (editingField === 'origin') {
      setOrigin(coords);
      setOriginSearch(shortName);
      setEditingField('dest');
    } else {
      setDestination(coords);
      setDestSearch(shortName);
    }
    setSuggestions([]);
    setShowSuggestions(false);
    const map = (window as any).__leafletMap;
    if (map) map.setView([item.lat, item.lon], 16);
  };
  /* ==================== FIN BÚSQUEDA ==================== */

  /* ==================== CÁLCULO DE RUTA ==================== */
  const calculateRoute = async () => {
    if (!origin || !destination) return;
    setLoading(true); setError(null);
    try {
      const res = await axios.post(API_BASE_URL + '/api/v1/routes', {
        origin: { lat: origin.latitude, lon: origin.longitude },
        destination: { lat: destination.latitude, lon: destination.longitude },
        transport_mode: transportMode, preference,
      });

      let profile = 'bike';
      if (transportMode === 'walking') profile = 'foot';
      else if (transportMode === 'skateboard') profile = 'foot';

      let waypoints = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
      if (transportMode === 'bicycle' && preference === 'leisure') {
        waypoints = `${origin.longitude},${origin.latitude};-0.3688,39.4730;${destination.longitude},${destination.latitude}`;
      }
      if (transportMode === 'skateboard') {
        waypoints = `${origin.longitude},${origin.latitude};-0.3763,39.4699;${destination.longitude},${destination.latitude}`;
      }

      const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${waypoints}?geometries=geojson&overview=full&alternatives=${preference === 'leisure' ? 'true' : 'false'}`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();

      if (osrmData.routes && osrmData.routes.length > 0) {
        const L = (window as any).L;
        const map = (window as any).__leafletMap;
        if (!map || !L) return;

        if ((window as any).__routeLine) map.removeLayer((window as any).__routeLine);

        let chosenRoute = osrmData.routes[0];
        if (preference === 'leisure' && osrmData.routes.length > 1) {
          chosenRoute = osrmData.routes[1];
        }

        const coords = chosenRoute.geometry.coordinates.map((c: any) => [c[1], c[0]]);

        let routeColor = '#2ecc71';
        let routeDash: string | null = null;
        if (transportMode === 'walking') { routeColor = '#3498db'; routeDash = '5, 10'; }
        else if (transportMode === 'scooter') { routeColor = '#f39c12'; }
        else if (transportMode === 'skateboard') { routeColor = '#9b59b6'; routeDash = '10, 5'; }

        const lineOptions: any = { color: routeColor, weight: 5, opacity: 0.8 };
        if (routeDash) lineOptions.dashArray = routeDash;

        (window as any).__routeLine = L.polyline(coords, lineOptions).addTo(map);
        map.fitBounds((window as any).__routeLine.getBounds(), { padding: [50, 50] });

        let distKm = chosenRoute.distance / 1000;
        let durMin = Math.round(chosenRoute.duration / 60);
        const speeds: Record<string, number> = { walking: 5, bicycle: 15, scooter: 12, skateboard: 10 };
        durMin = Math.round((distKm / (speeds[transportMode] || 10)) * 60);

        const greenPct = preference === 'leisure' ? 0.7 : transportMode === 'bicycle' ? 0.5 : transportMode === 'walking' ? 0.6 : 0.3;
        const aqi = preference === 'leisure' ? 2.0 : transportMode === 'walking' ? 2.5 : 3.0;

        setRoute({
          total_distance_km: parseFloat(distKm.toFixed(2)),
          total_duration_min: durMin,
          co2_saved_kg: parseFloat((distKm * 0.12).toFixed(2)),
          avg_air_quality_index: aqi,
          green_percentage: greenPct,
        });
        setShowResults(true);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  /* ==================== FIN CÁLCULO RUTA ==================== */

  /* ==================== RESET ==================== */
  const reset = () => {
    if ((window as any).__routeLine) { (window as any).__leafletMap.removeLayer((window as any).__routeLine); (window as any).__routeLine = null; }
    if ((window as any).__altRouteLine) { (window as any).__leafletMap.removeLayer((window as any).__altRouteLine); (window as any).__altRouteLine = null; }
    if ((window as any).__destMarker) { (window as any).__leafletMap.removeLayer((window as any).__destMarker); (window as any).__destMarker = null; }
    setRoute(null); setShowResults(false);
    setOrigin(userLocation); setDestination(null);
    setEditingField('dest'); setError(null);
    setOriginSearch('Mi ubicación'); setDestSearch('');
    setSuggestions([]); setShowSuggestions(false);
  };
  /* ==================== FIN RESET ==================== */

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* ==================== MAPA ==================== */}
      <div id="leaflet-map" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} />
      {/* ==================== FIN MAPA ==================== */}

      {/* ==================== PANEL IZQUIERDO: BÚSQUEDA + BOTÓN ==================== */}
      <View style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, width: 300, gap: 4 }}>

        {/* CAMPO ORIGEN */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 10, padding: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>A</Text>
          </View>
          <input placeholder="Origen..." value={originSearch} onChange={(e: any) => handleSearchInput(e.target.value, 'origin')} onFocus={() => { setEditingField('origin'); if (originSearch.length >= 2) setShowSuggestions(true); }} style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 12 }} />
          <TouchableOpacity onPress={getLocation}><Text style={{ fontSize: 14 }}>📍</Text></TouchableOpacity>
        </View>

        {/* CAMPO DESTINO */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 10, padding: 8, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', marginRight: 6 }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>B</Text>
          </View>
          <input placeholder="Destino..." value={destSearch} onChange={(e: any) => handleSearchInput(e.target.value, 'dest')} onFocus={() => { setEditingField('dest'); if (destSearch.length >= 2) setShowSuggestions(true); }} style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 12 }} />
        </View>

        {/* SUGERENCIAS */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 10, padding: 6, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 }}>
            {suggestions.map((s: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => selectSuggestion(s)} style={{ padding: 8, borderBottomWidth: i < suggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                <Text style={{ fontSize: 11, color: '#333' }}>📍 {s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* BOTÓN CALCULAR */}
        {!showResults && (
          <TouchableOpacity style={{ backgroundColor: '#2ecc71', padding: 10, borderRadius: 10, alignItems: 'center' }} onPress={calculateRoute}>
            {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>🚀 Calcular Ruta Eco</Text>}
          </TouchableOpacity>
        )}
      </View>
      {/* ==================== FIN PANEL IZQUIERDO ==================== */}

      {/* ==================== PANEL DERECHO: TRANSPORTE + ECO/PASEO ==================== */}
      <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, gap: 10 }}>

        {/* SELECTOR DE TRANSPORTE */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderRadius: 14, padding: 6, gap: 4 }}>
          {['walking', 'bicycle', 'scooter', 'skateboard'].map(m => (
            <TouchableOpacity key={m} style={{ width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: transportMode === m ? '#2ecc71' : 'rgba(240,240,240,0.5)' }} onPress={() => setTransportMode(m)} title={TRANSPORT_LABELS[m]}>
              <Text style={{ fontSize: 22 }}>{TRANSPORT_ICONS[m]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* SELECTOR ECO/PASEO */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)', borderRadius: 14, padding: 6, gap: 6 }}>
          <TouchableOpacity style={{ padding: 8, borderRadius: 14, alignItems: 'center', backgroundColor: preference === 'eco_fast' ? '#2ecc71' : 'rgba(240,240,240,0.5)' }} onPress={() => setPreference('eco_fast')} title="Ruta rápida evitando contaminación">
            <Text style={{ fontSize: 20 }}>⚡</Text>
            <Text style={{ fontSize: 8, color: preference === 'eco_fast' ? '#fff' : '#999', fontWeight: preference === 'eco_fast' ? 'bold' : 'normal', marginTop: 1 }}>ECO</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8, borderRadius: 14, alignItems: 'center', backgroundColor: preference === 'leisure' ? '#2ecc71' : 'rgba(240,240,240,0.5)' }} onPress={() => setPreference('leisure')} title="Ruta agradable por parques y zonas verdes">
            <Text style={{ fontSize: 20 }}>🌸</Text>
            <Text style={{ fontSize: 8, color: preference === 'leisure' ? '#fff' : '#999', fontWeight: preference === 'leisure' ? 'bold' : 'normal', marginTop: 1 }}>Paseo</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* ==================== FIN PANEL DERECHO ==================== */}

      {/* ==================== PANEL RESULTADOS ==================== */}
      {showResults && route && (
        <View style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 2000, width: 300, backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', borderRadius: 14, padding: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#333' }}>{TRANSPORT_ICONS[transportMode]} {TRANSPORT_LABELS[transportMode]}</Text>
            <TouchableOpacity onPress={reset} style={{ backgroundColor: '#e74c3c', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10 }}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={{ gap: 3 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 5, backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#666' }}>📏 Distancia</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{route.total_distance_km} km</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 5, backgroundColor: 'rgba(52,152,219,0.08)', borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#666' }}>⏱️ Duración</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{route.total_duration_min} min</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 5, backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#666' }}>🌍 CO₂ ahorrado</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{route.co2_saved_kg} kg</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 5, backgroundColor: 'rgba(243,156,18,0.08)', borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#666' }}>💨 Aire</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: route.avg_air_quality_index <= 2 ? '#2ecc71' : route.avg_air_quality_index <= 3 ? '#f39c12' : '#e74c3c' }}>{route.avg_air_quality_index}/5</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 5, backgroundColor: 'rgba(46,204,113,0.08)', borderRadius: 6 }}>
              <Text style={{ fontSize: 11, color: '#666' }}>🌳 Zonas verdes</Text>
              <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#333' }}>{(route.green_percentage * 100).toFixed(0)}%</Text>
            </View>
          </View>
          <TouchableOpacity style={{ backgroundColor: '#3498db', padding: 6, borderRadius: 16, alignItems: 'center', marginTop: 6 }} onPress={reset}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: 'bold' }}>🔄 Nueva Ruta</Text>
          </TouchableOpacity>
        </View>
      )}
      {/* ==================== FIN PANEL RESULTADOS ==================== */}

      {/* ==================== ERROR ==================== */}
      {error && (
        <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 3000, backgroundColor: 'rgba(231,76,60,0.9)', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontSize: 12 }}>❌ {error}</Text>
        </View>
      )}
      {/* ==================== FIN ERROR ==================== */}
    </View>
  );
}