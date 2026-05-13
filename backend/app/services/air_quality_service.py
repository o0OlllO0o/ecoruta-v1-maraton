import httpx
import logging
from datetime import datetime
from typing import Dict
from app.config.settings import settings

logger = logging.getLogger(__name__)

class AirQualityService:
    def __init__(self):
        self.cache = {}
        self.cache_ttl = 300

    async def get_valencia_air_quality(self) -> Dict:
        if self.cache and (datetime.now() - self.cache.get("timestamp", datetime.min)).seconds < self.cache_ttl:
            return self.cache["data"]
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"{settings.VALENCIA_OPEN_DATA_URL}/catalog/datasets/"
                    "calidad-aire-estacions-contaminacio-fondo/records",
                    params={"limit": 5}, timeout=10
                )
                if resp.status_code == 200:
                    data = resp.json()
                    processed = self._process_data(data)
                    self.cache = {"timestamp": datetime.now(), "data": processed}
                    return processed
        except Exception as e:
            logger.error(f"Error AQ: {e}")
        return {"city_avg_aqi": 2.5, "stations": []}

    def _process_data(self, raw: Dict) -> Dict:
        stations = []
        for r in raw.get("records", []):
            f = r.get("fields", {})
            stations.append({
                "name": f.get("nom_estacio", "Desconocida"),
                "aqi": min(5, max(1, int((f.get("no2", 0)/200 + f.get("pm10", 0)/50) * 2.5)))
            })
        avg = sum(s["aqi"] for s in stations) / len(stations) if stations else 2.5
        return {"stations": stations, "city_avg_aqi": avg}
