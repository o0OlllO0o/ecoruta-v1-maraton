from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import routes

app = FastAPI(title="EcoRuta Valencia API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(routes.router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "EcoRuta Valencia API", "status": "ok"}
