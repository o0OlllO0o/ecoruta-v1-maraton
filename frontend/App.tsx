import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouteStore } from './src/store/routeStore';

export default function App() {
  const { routes, loading, error, calculateRoute } = useRouteStore();

  const testRoute = () => {
    calculateRoute(
      { lat: 39.4699, lon: -0.3763 },
      { lat: 39.4544, lon: -0.3507 },
      'bicycle',
      'eco_fast'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🌿 EcoRuta Valencia</Text>
      <TouchableOpacity style={styles.button} onPress={testRoute}>
        <Text style={styles.buttonText}>Calcular Ruta de Prueba</Text>
      </TouchableOpacity>
      {loading && <Text style={styles.status}>⏳ Calculando ruta ecologica...</Text>}
      {error && <Text style={styles.error}>❌ Error: {error}</Text>}
      {routes.map(r => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>✅ Ruta encontrada</Text>
          <Text>📏 Distancia: {r.total_distance_km} km</Text>
          <Text>⏱ Duracion: {r.total_duration_min} min</Text>
          <Text>🌍 CO2 ahorrado: {r.co2_saved_kg} kg</Text>
          <Text>💨 Calidad aire: {r.avg_air_quality_index}/5</Text>
          <Text>🌳 Zonas verdes: {(r.green_percentage * 100).toFixed(0)}%</Text>
        </View>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#2ecc71', textAlign: 'center', marginVertical: 20 },
  button: { backgroundColor: '#2ecc71', padding: 16, borderRadius: 25, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  status: { textAlign: 'center', color: '#666', marginVertical: 10 },
  error: { color: '#e74c3c', textAlign: 'center', marginVertical: 10 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginVertical: 5, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8, color: '#333' }
});
