import logging
from datetime import datetime
from typing import List
from geopy.distance import geodesic
from app.models.route import RouteRequest, EcoRoute, RouteSegment, TransportMode, RoutePreference
from app.services.air_quality_service import AirQualityService
from app.services.mobility_service import MobilityServiceClass

logger = logging.getLogger(__name__)

class EcoRouteCalculator:
    def __init__(self):
        self.aq = AirQualityService()
        self.mob = MobilityServiceClass()

    async def calculate_eco_route(self, req: RouteRequest) -> List[EcoRoute]:
        aq_data = await self.aq.get_valencia_air_quality()
        aqi = aq_data.get("city_avg_aqi", 3)
        distance_km = round(geodesic((req.origin.lat, req.origin.lon), (req.destination.lat, req.destination.lon)).kilometers, 2)
        speeds = {TransportMode.WALKING: 5, TransportMode.BICYCLE: 15, TransportMode.SCOOTER: 12, TransportMode.SKATEBOARD: 10}
        speed = speeds.get(req.transport_mode, 10)
        duration_min = round((distance_km / speed) * 60, 1)
        co2_saved = round(distance_km * 0.12, 2)
        green_pct = 0.7 if req.preference == RoutePreference.LEISURE else 0.3
        eco_aqi = max(1, aqi - 1) if req.preference == RoutePreference.LEISURE else aqi
        segments = [RouteSegment(
            coordinates=[req.origin, req.destination], distance_meters=distance_km * 1000,
            duration_seconds=duration_min * 60, instructions=["Ruta ecológica calculada"],
            air_quality={"aqi": int(eco_aqi), "description": "Buena" if eco_aqi < 3 else "Moderada"},
            road_type="park" if req.preference == RoutePreference.LEISURE else "bike_lane"
        )]
        services = await self.mob.get_nearby_services(req.origin, req.transport_mode)
        route = EcoRoute(
            id=f"r_{datetime.now().timestamp()}", origin=req.origin, destination=req.destination,
            transport_mode=req.transport_mode, preference=req.preference,
            total_distance_km=distance_km, total_duration_min=duration_min,
            co2_saved_kg=co2_saved, avg_air_quality_index=eco_aqi, green_percentage=green_pct,
            segments=segments, nearby_mobility_services=services
        )
        return [route]
