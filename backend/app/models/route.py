from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class TransportMode(str, Enum):
    WALKING = "walking"
    BICYCLE = "bicycle"
    SCOOTER = "scooter"
    SKATEBOARD = "skateboard"

class RoutePreference(str, Enum):
    ECO_FAST = "eco_fast"
    LEISURE = "leisure"

class GeoPoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lon: float = Field(..., ge=-180, le=180)

class RouteRequest(BaseModel):
    origin: GeoPoint
    destination: GeoPoint
    transport_mode: TransportMode
    preference: RoutePreference

class RouteSegment(BaseModel):
    coordinates: List[GeoPoint] = []
    distance_meters: float = 0
    duration_seconds: float = 0
    instructions: List[str] = []
    air_quality: Optional[dict] = None
    road_type: str = "street"

class MobilityService(BaseModel):
    id: str
    name: str
    type: str
    location: GeoPoint
    available_vehicles: int = 0
    total_capacity: int = 0
    price_per_minute: Optional[float] = None
    walking_distance: float = 0

class EcoRoute(BaseModel):
    id: str
    origin: GeoPoint
    destination: GeoPoint
    transport_mode: TransportMode
    preference: RoutePreference
    total_distance_km: float = 0
    total_duration_min: float = 0
    co2_saved_kg: float = 0
    avg_air_quality_index: float = 0
    green_percentage: float = 0
    segments: List[RouteSegment] = []
    nearby_mobility_services: List[MobilityService] = []
    calculated_at: datetime = Field(default_factory=datetime.now)
