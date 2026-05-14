import { create } from 'zustand';
import axios from 'axios';
import { API_BASE_URL } from '../constants';
import { EcoRoute, GeoPoint } from '../types';

interface RouteState {
  routes: EcoRoute[];
  loading: boolean;
  error: string | null;
  calculateRoute: (origin: GeoPoint, dest: GeoPoint, mode: string, pref: string) => Promise<void>;
}

export const useRouteStore = create<RouteState>((set) => ({
  routes: [], loading: false, error: null,
  calculateRoute: async (origin, dest, mode, pref) => {
    set({ loading: true, error: null });
    try {
      const url = API_BASE_URL + '/api/v1/routes';
      const res = await axios.post(url, {
        origin: origin,
        destination: dest,
        transport_mode: mode,
        preference: pref
      });
      set({ routes: res.data, loading: false });
    } catch (e: any) {
      set({ error: e.message || 'Error de conexion', loading: false });
    }
  }
}));