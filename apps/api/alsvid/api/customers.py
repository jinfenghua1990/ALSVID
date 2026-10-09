from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from alsvid.api.dependencies import Principal, permission_dependency
from alsvid.db import get_db
from alsvid.services.customer_center import customer_detail, list_customers

router = APIRouter(prefix="/api/v1/customer-center", tags=["customer-center"])


@router.get("/customers")
def get_customers(
    q: str | None = None,
    country_code: str | None = None,
    model_code: str | None = None,
    dealer_partner_id: str | None = None,
    lifecycle_state: str | None = None,
    service_state: str | None = None,
    marketing_status: str | None = None,
    _principal: Principal = Depends(permission_dependency("alsvid.customer.read")),
    db: Session = Depends(get_db),
):
    return list_customers(
        db,
        q=q,
        country_code=country_code,
        model_code=model_code,
        dealer_partner_id=dealer_partner_id,
        lifecycle_state=lifecycle_state,
        service_state=service_state,
        marketing_status=marketing_status,
    )


@router.get("/customers/{partner_id}")
def get_customer(
    partner_id: str,
    _principal: Principal = Depends(permission_dependency("alsvid.customer.read")),
    db: Session = Depends(get_db),
):
    try:
        return customer_detail(db, partner_id=partner_id)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
