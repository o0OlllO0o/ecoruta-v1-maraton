from fastapi import APIRouter, HTTPException
from app.models.route import RouteRequest, EcoRoute
from app.services.route_calculator import EcoRouteCalculator
import logging

router = APIRouter()
calc = EcoRouteCalculator()
logger = logging.getLogger(__name__)

@router.post("/routes", response_model=list[EcoRoute])
async def calculate_routes(req: RouteRequest):
    try:
        routes = await calc.calculate_eco_route(req)
        if not routes:
            raise HTTPException(status_code=404, detail="Sin rutas disponibles")
        return routes
    except Exception as e:
        logger.error(f"Error en ruta: {e}")
        raise HTTPException(status_code=500, detail=str(e))
