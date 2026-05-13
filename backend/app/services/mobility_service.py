import httpx
import logging
from typing import List
from geopy.distance import geodesic
from app.models.route import MobilityService, GeoPoint, TransportMode
from app.config.settings import settings

logger = logging.getLogger(__name__)

class MobilityServiceClass:
    async def get_nearby_services(self, location: GeoPoint, mode: TransportMode, radius_km: float = 1.0) -> List[MobilityService]:
        services = []
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.VALENBISI_API_URL}/stations",
                    params={"apiKey": settings.VALENBISI_API_KEY, "contract": "Valencia"},
                    timeout=10
                )
                if resp.status_code == 200:
                    for s in resp.json():
                        sl = GeoPoint(lat=s["position"]["lat"], lon=s["position"]["lng"])
                        d = geodesic((location.lat, location.lon), (sl.lat, sl.lon)).kilometers
                        if d <= radius_km:
                            services.append(MobilityService(
                                id=f"vb_{s['number']}", name=s["name"], type="bicycle",
                                location=sl, available_vehicles=s.get("available_bikes", 0),
                                total_capacity=s.get("bike_stands", 0), price_per_minute=0.04,
                                walking_distance=round(d * 1000)
                            ))
        except Exception as e:
            logger.error(f"Error movilidad: {e}")
        services.sort(key=lambda x: x.walking_distance)
        return services[:10]
