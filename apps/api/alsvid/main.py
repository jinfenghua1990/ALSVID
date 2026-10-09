from fastapi import FastAPI

from alsvid.api.assets import router as assets_router
from alsvid.api.auth import router as auth_router
from alsvid.api.customers import router as customers_router
from alsvid.api.dealer import router as dealer_router
from alsvid.api.export_compliance import router as export_compliance_router
from alsvid.api.inventory import router as inventory_router
from alsvid.api.my_alsvid import router as my_alsvid_router
from alsvid.api.operations import commercial_router, finance_router, logistics_router
from alsvid.api.product import router as product_router
from alsvid.api.service_center import router as service_center_router
from alsvid.api.vehicles import router as vehicles_router
from alsvid.config import get_settings

settings = get_settings()

app = FastAPI(
    title="ALSVID",
    description="Standalone operating platform for the ALSVID bicycle business",
    version="0.1.0",
)

app.include_router(auth_router)
app.include_router(product_router)
app.include_router(assets_router)
app.include_router(vehicles_router)
app.include_router(customers_router)
app.include_router(service_center_router)
app.include_router(dealer_router)
app.include_router(my_alsvid_router)
app.include_router(commercial_router)
app.include_router(logistics_router)
app.include_router(export_compliance_router)
app.include_router(inventory_router)
app.include_router(finance_router)


@app.get("/health", tags=["system"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "alsvid",
        "environment": settings.environment,
    }
