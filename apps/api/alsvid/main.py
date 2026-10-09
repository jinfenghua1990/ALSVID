from fastapi import FastAPI

from alsvid.config import get_settings

settings = get_settings()

app = FastAPI(
    title="ALSVID",
    description="Standalone operating platform for the ALSVID bicycle business",
    version="0.1.0",
)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "alsvid",
        "environment": settings.environment,
    }
