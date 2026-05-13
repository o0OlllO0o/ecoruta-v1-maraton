export type TransportMode = 'walking' | 'bicycle' | 'scooter' | 'skateboard';
export type RoutePreference = 'eco_fast' | 'leisure';
export interface GeoPoint { lat: number; lon: number; }
export interface EcoRoute {
  id: string; total_distance_km: number; total_duration_min: number;
  co2_saved_kg: number; avg_air_quality_index: number; green_percentage: number;
}
