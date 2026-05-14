import os

class Settings:
    VALENBISI_API_KEY: str = os.getenv("VALENBISI_API_KEY", "demo_key")
    VALENBISI_API_URL: str = "https://api.jcdecaux.com/vls/v3"
    VALENCIA_OPEN_DATA_URL: str = "https://valencia.opendatasoft.com/api/v2"
    DATABASE_URL: str = "postgresql://user:pass@localhost:5432/ecoruta"
    REDIS_URL: str = "redis://localhost:6379/0"
    ROUTE_CACHE_TTL: int = 300
    MAX_ROUTE_ALTERNATIVES: int = 3

settings = Settings()
