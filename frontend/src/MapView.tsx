import React, { useEffect } from 'react';
import { Platform } from 'react-native';

const WebMap = ({ onPress, region }: any) => {
  useEffect(() => {
    const L = (window as any).L;
    if (!L) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = initMap;
      document.head.appendChild(script);
    } else {
      initMap();
    }
    function initMap() {
      const L = (window as any).L;
      if (!L) return;
      const map = L.map('mapid').setView([region.latitude, region.longitude], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(map);
      map.on('click', (e: any) => {
        if (onPress) onPress({ nativeEvent: { coordinate: { latitude: e.latlng.lat, longitude: e.latlng.lng } } });
      });
    }
  }, []);
  return <div id="mapid" style={{ width: '100%', height: '100%' }} />;
};

export default function MapView(props: any) {
  if (Platform.OS === 'web') return <WebMap {...props} />;
  const RNMap = require('react-native-maps').default;
  return <RNMap {...props} />;
}

export const Marker = () => null;
export const Polyline = () => null;
