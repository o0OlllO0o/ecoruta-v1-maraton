import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import { API_BASE_URL } from './src/constants';

const VALENCIA_PLACES: Record<string, { lat: number; lon: number }> = {
  'plaza ayuntamiento': { lat: 39.4699, lon: -0.3763 },
  'ciudad de las ciencias': { lat: 39.4544, lon: -0.3507 },
  'estacion del norte': { lat: 39.4668, lon: -0.3774 },
  'jardin del turia': { lat: 39.4730, lon: -0.3700 },
};

const TRANSPORT_ICONS: Record<string, string> = {
  walking: '🚶', bicycle: '🚲', scooter: '🛴', skateboard: '🛹',
};
const TRANSPORT_LABELS: Record<string, string> = {
  walking: 'Andando', bicycle: 'Bicicleta', scooter: 'Patinete', skateboard: 'Monopatín',
};

export default function App() {
  const [userLocation, setUserLocation] = useState<any>(null);
  const [origin, setOrigin] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [transportMode, setTransportMode] = useState('bicycle');
  const [preference, setPreference] = useState('eco_fast');
  const [route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectingOrigin, setSelectingOrigin] = useState(true);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    getLocation();
    if (Platform.OS === 'web') loadLeaflet();
  }, []);

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
        setSelectingOrigin(false);
      } else {
        setDestination(coord);
      }
    });
    (window as any).__leafletMap = map;
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
    setUserLocation(coords);
    setOrigin(coords);
  };

  const searchPlace = (name: string) => {
    const coords = VALENCIA_PLACES[name.toLowerCase()];
    if (!coords) return Alert.alert('No encontrado');
    if (selectingOrigin) { setOrigin(coords); setSelectingOrigin(false); }
    else setDestination(coords);
  };

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
    } catch (e: any) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const reset = () => {
    setRoute(null); setShowResults(false);
    setOrigin(userLocation); setDestination(null);
    setSelectingOrigin(true); setError(null);
  };

  return (
    <View style={{ flex: 1, position: 'relative' }}>
      {/* MAPA */}
      <div id="leaflet-map" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 }} />

      {/* BARRA SUPERIOR */}
      <View style={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, padding: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>{selectingOrigin ? '🟢 ORIGEN' : '🔴 DESTINO'}</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: '#f0f0f0', borderRadius: 20, padding: 10 }} onPress={() => {
            const name = prompt('Buscar: plaza ayuntamiento, ciudad de las ciencias...');
            if (name) searchPlace(name);
          }}>
            <Text style={{ color: '#666' }}>🔍 Buscar lugar...</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#2ecc71', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' }} onPress={getLocation}>
            <Text style={{ fontSize: 20 }}>📍</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TRANSPORTE */}
      <View style={{ position: 'absolute', left: 10, top: '35%', zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 8, gap: 8 }}>
        {['walking', 'bicycle', 'scooter', 'skateboard'].map(m => (
          <TouchableOpacity key={m} style={{ width: transportMode === m ? 'auto' : 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', backgroundColor: transportMode === m ? '#2ecc71' : '#f0f0f0', flexDirection: 'row', paddingHorizontal: transportMode === m ? 12 : 0 }} onPress={() => setTransportMode(m)}>
            <Text style={{ fontSize: 24 }}>{TRANSPORT_ICONS[m]}</Text>
            {transportMode === m && <Text style={{ color: '#fff', fontSize: 10, marginLeft: 4 }}>{TRANSPORT_LABELS[m]}</Text>}
          </TouchableOpacity>
        ))}
      </View>

      {/* PREFERENCIA */}
      <View style={{ position: 'absolute', right: 10, top: '35%', zIndex: 1000, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 20, padding: 8, gap: 8 }}>
        <TouchableOpacity style={{ padding: 10, borderRadius: 20, alignItems: 'center', backgroundColor: preference === 'eco_fast' ? '#2ecc71' : '#f0f0f0' }} onPress={() => setPreference('eco_fast')}>
          <Text style={{ fontSize: 20 }}>⚡</Text><Text style={{ fontSize: 10, color: preference === 'eco_fast' ? '#fff' : '#666' }}>ECO</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ padding: 10, borderRadius: 20, alignItems: 'center', backgroundColor: preference === 'leisure' ? '#2ecc71' : '#f0f0f0' }} onPress={() => setPreference('leisure')}>
          <Text style={{ fontSize: 20 }}>🌸</Text><Text style={{ fontSize: 10, color: preference === 'leisure' ? '#fff' : '#666' }}>Paseo</Text>
        </TouchableOpacity>
      </View>

      {/* BOTÓN CALCULAR */}
      {!showResults && (
        <TouchableOpacity style={{ position: 'absolute', bottom: 30, left: 30, right: 30, zIndex: 1000, backgroundColor: '#2ecc71', padding: 18, borderRadius: 30, alignItems: 'center' }} onPress={calculateRoute}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>🚀 Calcular Ruta Eco</Text>}
        </TouchableOpacity>
      )}

      {/* RESULTADOS */}
      {showResults && route && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2000, backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, paddingBottom: 30 }}>
          <TouchableOpacity style={{ position: 'absolute', top: 10, right: 15, zIndex: 10, backgroundColor: '#e74c3c', width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' }} onPress={reset}><Text style={{ color: '#fff' }}>✕</Text></TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 }}>{TRANSPORT_ICONS[transportMode]} {TRANSPORT_LABELS[transportMode]}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' }}>
            {[
              ['📏', route.total_distance_km + ' km'],
              ['⏱️', route.total_duration_min + ' min'],
              ['🌍', route.co2_saved_kg + ' kg CO₂'],
              ['💨', 'Aire: ' + route.avg_air_quality_index + '/5'],
              ['🌳', (route.green_percentage * 100).toFixed(0) + '% verde'],
            ].map(([icon, val], i) => (
              <View key={i} style={{ width: '30%', alignItems: 'center', backgroundColor: '#f0f0f0', padding: 10, borderRadius: 12, marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>{icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#333', textAlign: 'center' }}>{val}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={{ backgroundColor: '#3498db', padding: 12, borderRadius: 25, alignItems: 'center', marginTop: 10 }} onPress={reset}>
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>🔄 Nueva Ruta</Text>
          </TouchableOpacity>
        </View>
      )}

      {error && (
        <View style={{ position: 'absolute', bottom: 30, left: 20, right: 20, zIndex: 3000, backgroundColor: '#e74c3c', padding: 15, borderRadius: 15 }}>
          <Text style={{ color: '#fff' }}>❌ {error}</Text>
        </View>
      )}
    </View>
  );
}