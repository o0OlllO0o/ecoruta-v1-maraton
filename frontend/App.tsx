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
  const [selectingOrigin, setSelectingOrigin] = useState(true);
  const [originSearch, setOriginSearch] = useState('');
  const [destSearch, setDestSearch] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [routeLine, setRouteLine] = useState<any>(null);
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
    }
  }, [origin, destination]);
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
      if (selectingOrigin) {
        setOrigin(coord);
        setOriginSearch(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
        setSelectingOrigin(false);
      } else {
        setDestination(coord);
        setDestSearch(`${coord.latitude.toFixed(5)}, ${coord.longitude.toFixed(5)}`);
      }
    });
    (window as any).__leafletMap = map;
    (window as any).__originMarker = null;
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
  const handleSearchInput = (text: string) => {
    if (selectingOrigin) setOriginSearch(text);
    else setDestSearch(text);
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
    if (selectingOrigin) { setOrigin(coords); setOriginSearch(shortName); setSelectingOrigin(false); }
    else { setDestination(coords); setDestSearch(shortName); }
    setSuggestions([]); setShowSuggestions(false);
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
      if (res.data?.[0]) { setRoute(res.data[0]); setShowResults(true); }

      const profile = transportMode === 'walking' ? 'foot' : 'bike';
      const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?geometries=geojson&overview=full`;
      const osrmRes = await fetch(osrmUrl);
      const osrmData = await osrmRes.json();
      if (osrmData.routes?.[0]?.geometry) {
        const coords = osrmData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
        const L = (window as any).L;
        const map = (window as any).__leafletMap;
        if (map && L) {
          if ((window as any).__routeLine) map.removeLayer((window as any).__routeLine);
          (window as any).__routeLine = L.polyline(coords, { color: '#2ecc71', weight: 5, opacity: 0.7 }).addTo(map);
          map.fitBounds((window as any).__routeLine.getBounds(), { padding: [50, 50] });
        }
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };
  /* ==================== FIN CÁLCULO RUTA ==================== */

  /* ==================== RESET ==================== */
  const reset = () => {
    if ((window as any).__routeLine) { (window as any).__leafletMap.removeLayer((window as any).__routeLine); (window as any).__routeLine = null; }
    if ((window as any).__destMarker) { (window as any).__leafletMap.removeLayer((window as any).__destMarker); (window as any).__destMarker = null; }
    setRoute(null); setShowResults(false);
    setOrigin(userLocation); setDestination(null);
    setSelectingOrigin(true); setError(null);
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
      <View style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000, width: 340, gap: 6 }}>
        
        {/* CAMPO ORIGEN */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
            <Text style={{ color: '#fff', fontSize: 12 }}>A</Text>
          </View>
          <input placeholder="Origen..." value={originSearch} onChange={(e: any) => { setSelectingOrigin(true); handleSearchInput(e.target.value); }} onFocus={() => { setSelectingOrigin(true); if (originSearch.length >= 2) setShowSuggestions(true); }} style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13 }} />
          <TouchableOpacity onPress={getLocation}><Text style={{ fontSize: 16 }}>📍</Text></TouchableOpacity>
        </View>

        {/* CAMPO DESTINO */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#e74c3c', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
            <Text style={{ color: '#fff', fontSize: 12 }}>B</Text>
          </View>
          <input placeholder="Destino..." value={destSearch} onChange={(e: any) => { setSelectingOrigin(false); handleSearchInput(e.target.value); }} onFocus={() => { setSelectingOrigin(false); if (destSearch.length >= 2) setShowSuggestions(true); }} style={{ flex: 1, border: 'none', outline: 'none', backgroundColor: 'transparent', fontSize: 13 }} />
        </View>

        {/* SUGERENCIAS */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8 }}>
            {suggestions.map((s: any, i: number) => (
              <TouchableOpacity key={i} onPress={() => selectSuggestion(s)} style={{ padding: 10, borderBottomWidth: i < suggestions.length - 1 ? 1 : 0, borderBottomColor: '#eee' }}>
                <Text style={{ fontSize: 13, color: '#333' }}>📍 {s.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* BOTÓN CALCULAR */}
        {!showResults && (
          <TouchableOpacity style={{ backgroundColor: '#2ecc71', padding: 14, borderRadius: 12, alignItems: 'center' }} onPress={calculateRoute}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>🚀 Calcular Ruta Eco</Text>}
          </TouchableOpacity>
        )}
      </View>
      {/* ==================== FIN PANEL IZQUIERDO ==================== */}

      {/* ==================== PANEL DERECHO: TRANSPORTE + ECO/PASEO ==================== */}
      <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 1000, gap: 8 }}>
        
        {/* SELECTOR DE TRANSPORTE */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 6, gap: 6 }}>
          {['walking', 'bicycle', 'scooter', 'skateboard'].map(m => (
            <TouchableOpacity key={m} style={{ width: transportMode === m ? 'auto' : 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', backgroundColor: transportMode === m ? '#2ecc71' : '#f0f0f0', flexDirection: 'row', paddingHorizontal: transportMode === m ? 10 : 0 }} onPress={() => setTransportMode(m)}>
              <Text style={{ fontSize: 22 }}>{TRANSPORT_ICONS[m]}</Text>
              {transportMode === m && <Text style={{ color: '#fff', fontSize: 9, marginLeft: 3 }}>{TRANSPORT_LABELS[m]}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* SELECTOR ECO/PASEO */}
        <View style={{ backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 6, gap: 6 }}>
          <TouchableOpacity style={{ padding: 8, borderRadius: 16, alignItems: 'center', backgroundColor: preference === 'eco_fast' ? '#2ecc71' : '#f0f0f0' }} onPress={() => setPreference('eco_fast')}>
            <Text style={{ fontSize: 18 }}>⚡</Text>
            <Text style={{ fontSize: 8, color: preference === 'eco_fast' ? '#fff' : '#666', fontWeight: preference === 'eco_fast' ? 'bold' : 'normal' }}>ECO</Text>
          </TouchableOpacity>
          <View style={{ height: 1, backgroundColor: '#e0e0e0', marginHorizontal: 4 }} />
          <TouchableOpacity style={{ padding: 8, borderRadius: 16, alignItems: 'center', backgroundColor: preference === 'leisure' ? '#2ecc71' : '#f0f0f0' }} onPress={() => setPreference('leisure')}>
            <Text style={{ fontSize: 18 }}>🌸</Text>
            <Text style={{ fontSize: 8, color: preference === 'leisure' ? '#fff' : '#666', fontWeight: preference === 'leisure' ? 'bold' : 'normal' }}>Paseo</Text>
          </TouchableOpacity>
        </View>
      </View>
      {/* ==================== FIN PANEL DERECHO ==================== */}

      {/* ==================== PANEL RESULTADOS ==================== */}
      {showResults && route && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2000, backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 }}>
          <TouchableOpacity style={{ position: 'absolute', top: 10, right: 15, zIndex: 10, backgroundColor: '#e74c3c', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }} onPress={reset}><Text style={{ color: '#fff' }}>✕</Text></TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>{TRANSPORT_ICONS[transportMode]} {TRANSPORT_LABELS[transportMode]}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
            {[['📏', route.total_distance_km + ' km'], ['⏱️', route.total_duration_min + ' min'], ['🌍', route.co2_saved_kg + ' kg CO₂'], ['💨', 'Aire: ' + route.avg_air_quality_index + '/5'], ['🌳', (route.green_percentage * 100).toFixed(0) + '% verde']].map(([icon, val], i) => (
              <View key={i} style={{ width: '30%', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 12, marginBottom: 8 }}><Text style={{ fontSize: 24 }}>{icon}</Text><Text style={{ fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>{val}</Text></View>
            ))}
          </View>
          <TouchableOpacity style={{ backgroundColor: '#3498db', padding: 12, borderRadius: 25, alignItems: 'center', marginTop: 10 }} onPress={reset}><Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Nueva Ruta</Text></TouchableOpacity>
        </View>
      )}
      {/* ==================== FIN PANEL RESULTADOS ==================== */}

      {/* ==================== ERROR ==================== */}
      {error && (
        <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 3000, backgroundColor: '#e74c3c', padding: 15, borderRadius: 15 }}>
          <Text style={{ color: '#fff' }}>❌ {error}</Text>
        </View>
      )}
      {/* ==================== FIN ERROR ==================== */}
    </View>
  );
}