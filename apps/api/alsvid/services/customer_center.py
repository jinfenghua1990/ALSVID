from collections import defaultdict
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from alsvid.models.customer import MarketingConsentEvent
from alsvid.models.engineering import BicycleModel
from alsvid.models.partners import BusinessPartner
from alsvid.models.service import ServiceCase, Warranty
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent


def _timestamp(value: datetime | None) -> float:
    if value is None:
        return float("-inf")
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.timestamp()


def _consent_view(event: MarketingConsentEvent) -> dict:
    return {
        "id": event.id,
        "channel": event.channel,
        "status": event.status,
        "source": event.source,
        "policy_version": event.policy_version,
        "occurred_at": event.occurred_at,
        "recorded_by_user_id": event.recorded_by_user_id,
    }


def _marketing_summary(
    partner_id: str,
    latest_consent: dict[tuple[str, str], MarketingConsentEvent],
) -> dict:
    event = latest_consent.get((partner_id, "EMAIL"))
    if event is None:
        return {
            "email_status": "NONE",
            "eligible": False,
            "last_changed_at": None,
            "source": None,
            "policy_version": None,
            "suppressed_at": None,
        }
    return {
        "email_status": event.status,
        "eligible": event.status == "GRANTED",
        "last_changed_at": event.occurred_at,
        "source": event.source,
        "policy_version": event.policy_version,
        "suppressed_at": event.occurred_at if event.status != "GRANTED" else None,
    }


def _load_facts(db: Session) -> dict:
    vehicle_rows = db.execute(
        select(Vehicle, BicycleModel)
        .join(BicycleModel, BicycleModel.id == Vehicle.model_id)
        .order_by(Vehicle.frame_number)
    ).all()
    if not vehicle_rows:
        return {
            "vehicles": {},
            "models": {},
            "partners": {},
            "dealers": {},
            "current_vehicle_ids": defaultdict(set),
            "related_vehicle_ids": defaultdict(set),
            "relationship_events": defaultdict(list),
            "warranties": {},
            "cases_by_vehicle": defaultdict(list),
            "consent_events": defaultdict(list),
            "latest_consent": {},
        }

    vehicles = {vehicle.id: vehicle for vehicle, _model in vehicle_rows}
    models = {vehicle.id: model for vehicle, model in vehicle_rows}
    vehicle_ids = set(vehicles)

    relationship_events: dict[str, list[VehicleLifecycleEvent]] = defaultdict(list)
    related_vehicle_ids: dict[str, set[str]] = defaultdict(set)
    current_vehicle_ids: dict[str, set[str]] = defaultdict(set)
    partner_ids: set[str] = set()

    for vehicle in vehicles.values():
        partner_id = vehicle.current_customer_partner_id
        if partner_id:
            partner_ids.add(partner_id)
            current_vehicle_ids[partner_id].add(vehicle.id)
            related_vehicle_ids[partner_id].add(vehicle.id)

    lifecycle_events = db.scalars(
        select(VehicleLifecycleEvent)
        .where(
            VehicleLifecycleEvent.vehicle_id.in_(vehicle_ids),
            VehicleLifecycleEvent.customer_partner_id.is_not(None),
        )
        .order_by(
            VehicleLifecycleEvent.occurred_at.asc(),
            VehicleLifecycleEvent.sequence_no.asc(),
            VehicleLifecycleEvent.id.asc(),
        )
    ).all()
    for event in lifecycle_events:
        partner_id = event.customer_partner_id
        if partner_id is None:
            continue
        partner_ids.add(partner_id)
        related_vehicle_ids[partner_id].add(event.vehicle_id)
        relationship_events[partner_id].append(event)

    partners = (
        {
            row.id: row
            for row in db.scalars(
                select(BusinessPartner).where(BusinessPartner.id.in_(partner_ids))
            ).all()
        }
        if partner_ids
        else {}
    )

    dealer_ids = {
        vehicle.current_dealer_partner_id
        for vehicle in vehicles.values()
        if vehicle.current_dealer_partner_id
    }
    dealers = (
        {
            row.id: row
            for row in db.scalars(
                select(BusinessPartner).where(BusinessPartner.id.in_(dealer_ids))
            ).all()
        }
        if dealer_ids
        else {}
    )

    warranties = {
        row.vehicle_id: row
        for row in db.scalars(select(Warranty).where(Warranty.vehicle_id.in_(vehicle_ids))).all()
    }

    cases_by_vehicle: dict[str, list[ServiceCase]] = defaultdict(list)
    for case in db.scalars(
        select(ServiceCase)
        .where(ServiceCase.vehicle_id.in_(vehicle_ids))
        .order_by(ServiceCase.opened_at.desc(), ServiceCase.id.desc())
    ).all():
        cases_by_vehicle[case.vehicle_id].append(case)

    consent_events: dict[str, list[MarketingConsentEvent]] = defaultdict(list)
    latest_consent: dict[tuple[str, str], MarketingConsentEvent] = {}
    if partner_ids:
        events = db.scalars(
            select(MarketingConsentEvent)
            .where(MarketingConsentEvent.partner_id.in_(partner_ids))
            .order_by(
                MarketingConsentEvent.occurred_at.asc(),
                MarketingConsentEvent.created_at.asc(),
                MarketingConsentEvent.id.asc(),
            )
        ).all()
        for event in events:
            consent_events[event.partner_id].append(event)
            latest_consent[(event.partner_id, event.channel)] = event

    return {
        "vehicles": vehicles,
        "models": models,
        "partners": partners,
        "dealers": dealers,
        "current_vehicle_ids": current_vehicle_ids,
        "related_vehicle_ids": related_vehicle_ids,
        "relationship_events": relationship_events,
        "warranties": warranties,
        "cases_by_vehicle": cases_by_vehicle,
        "consent_events": consent_events,
        "latest_consent": latest_consent,
    }


def _dealer_summary(partner: BusinessPartner | None) -> dict | None:
    if partner is None:
        return None
    return {"id": partner.id, "code": partner.code, "name": partner.name}


def _vehicle_card(facts: dict, vehicle_id: str, *, include_service: bool = True) -> dict:
    vehicle: Vehicle = facts["vehicles"][vehicle_id]
    model: BicycleModel = facts["models"][vehicle_id]
    dealer = facts["dealers"].get(vehicle.current_dealer_partner_id)
    warranty: Warranty | None = facts["warranties"].get(vehicle_id)
    cases: list[ServiceCase] = facts["cases_by_vehicle"].get(vehicle_id, [])
    open_cases = sum(case.status != "CLOSED" for case in cases) if include_service else 0
    return {
        "id": vehicle.id,
        "frame_number": vehicle.frame_number,
        "status": vehicle.status,
        "model": {"id": model.id, "code": model.code, "name": model.name},
        "purchase_date": vehicle.purchase_date,
        "activated_at": vehicle.activated_at,
        "dealer": _dealer_summary(dealer),
        "warranty": (
            {
                "id": warranty.id,
                "status": warranty.status,
                "start_date": warranty.start_date,
                "end_date": warranty.end_date,
            }
            if warranty is not None
            else None
        ),
        "open_service_cases": open_cases,
    }


def list_customers(
    db: Session,
    *,
    q: str | None = None,
    country_code: str | None = None,
    model_code: str | None = None,
    dealer_partner_id: str | None = None,
    lifecycle_state: str | None = None,
    service_state: str | None = None,
    marketing_status: str | None = None,
) -> list[dict]:
    facts = _load_facts(db)
    query = (q or "").strip().lower()
    normalized_country = (country_code or "").strip().upper()
    normalized_model = (model_code or "").strip().upper()
    normalized_lifecycle = (lifecycle_state or "").strip().upper()
    normalized_service = (service_state or "").strip().upper()
    normalized_marketing = (marketing_status or "").strip().upper()

    result: list[dict] = []
    for partner_id, related_ids in facts["related_vehicle_ids"].items():
        partner: BusinessPartner | None = facts["partners"].get(partner_id)
        if partner is None:
            continue
        current_ids: set[str] = facts["current_vehicle_ids"].get(partner_id, set())
        previous_ids = set(related_ids) - set(current_ids)
        current_cards = [_vehicle_card(facts, vehicle_id) for vehicle_id in sorted(current_ids)]
        related_cards = [
            _vehicle_card(facts, vehicle_id, include_service=False)
            for vehicle_id in sorted(related_ids)
        ]
        open_cases = sum(card["open_service_cases"] for card in current_cards)
        active_warranties = sum(
            card["warranty"] is not None and card["warranty"]["status"] == "ACTIVE"
            for card in current_cards
        )
        latest_purchase = max(
            (card["purchase_date"] for card in current_cards if card["purchase_date"] is not None),
            default=None,
        )
        lifecycle = "CURRENT_OWNER" if current_ids else "FORMER_OWNER"
        marketing = _marketing_summary(partner_id, facts["latest_consent"])

        model_values = {
            (card["model"]["code"], card["model"]["name"])
            for card in current_cards
        }
        dealer_values = {
            (card["dealer"]["id"], card["dealer"]["code"], card["dealer"]["name"])
            for card in current_cards
            if card["dealer"] is not None
        }

        if normalized_country and (partner.country_code or "").upper() != normalized_country:
            continue
        if normalized_model and all(
            card["model"]["code"].upper() != normalized_model for card in related_cards
        ):
            continue
        if dealer_partner_id and all(
            card["dealer"] is None or card["dealer"]["id"] != dealer_partner_id
            for card in current_cards
        ):
            continue
        if normalized_lifecycle and lifecycle != normalized_lifecycle:
            continue
        if normalized_service == "OPEN" and open_cases == 0:
            continue
        if normalized_service == "CLEAR" and open_cases != 0:
            continue
        if normalized_marketing and marketing["email_status"] != normalized_marketing:
            continue
        if query:
            haystack = " ".join(
                value
                for value in (
                    partner.code,
                    partner.name,
                    partner.email or "",
                    partner.phone or "",
                    *(card["frame_number"] for card in related_cards),
                    *(card["model"]["code"] for card in related_cards),
                    *(card["model"]["name"] for card in related_cards),
                    *(
                        card["dealer"]["name"]
                        for card in current_cards
                        if card["dealer"] is not None
                    ),
                )
                if value
            ).lower()
            if query not in haystack:
                continue

        result.append(
            {
                "id": partner.id,
                "code": partner.code,
                "name": partner.name,
                "country_code": partner.country_code,
                "email": partner.email,
                "phone": partner.phone,
                "lifecycle_state": lifecycle,
                "current_vehicle_count": len(current_ids),
                "previous_vehicle_count": len(previous_ids),
                "models": [
                    {"code": code, "name": name} for code, name in sorted(model_values)
                ],
                "dealers": [
                    {"id": dealer_id, "code": code, "name": name}
                    for dealer_id, code, name in sorted(dealer_values)
                ],
                "last_purchase_date": latest_purchase,
                "open_service_cases": open_cases,
                "active_warranties": active_warranties,
                "marketing": marketing,
            }
        )

    return sorted(result, key=lambda row: ((row["name"] or "").lower(), row["code"]))


def customer_detail(db: Session, *, partner_id: str) -> dict:
    facts = _load_facts(db)
    partner: BusinessPartner | None = facts["partners"].get(partner_id)
    related_ids: set[str] = facts["related_vehicle_ids"].get(partner_id, set())
    if partner is None or not related_ids:
        raise LookupError("ALSVID customer not found")

    current_ids: set[str] = facts["current_vehicle_ids"].get(partner_id, set())
    previous_ids = set(related_ids) - set(current_ids)
    current_vehicles = [_vehicle_card(facts, vehicle_id) for vehicle_id in sorted(current_ids)]

    previous_vehicles: list[dict] = []
    relationship_events: list[VehicleLifecycleEvent] = facts["relationship_events"].get(
        partner_id, []
    )
    events_by_vehicle: dict[str, list[VehicleLifecycleEvent]] = defaultdict(list)
    for event in relationship_events:
        events_by_vehicle[event.vehicle_id].append(event)
    for vehicle_id in sorted(previous_ids):
        vehicle: Vehicle = facts["vehicles"][vehicle_id]
        model: BicycleModel = facts["models"][vehicle_id]
        events = events_by_vehicle.get(vehicle_id, [])
        latest_related_at = max(events, key=lambda event: _timestamp(event.occurred_at)).occurred_at if events else None
        previous_vehicles.append(
            {
                "id": vehicle.id,
                "frame_number": vehicle.frame_number,
                "status": vehicle.status,
                "model": {"id": model.id, "code": model.code, "name": model.name},
                "relationship_event_types": sorted({event.event_type for event in events}),
                "last_related_at": latest_related_at,
            }
        )

    service_cases: list[dict] = []
    for vehicle_id in current_ids:
        vehicle = facts["vehicles"][vehicle_id]
        for case in facts["cases_by_vehicle"].get(vehicle_id, []):
            service_cases.append(
                {
                    "id": case.id,
                    "vehicle_id": vehicle.id,
                    "frame_number": vehicle.frame_number,
                    "status": case.status,
                    "priority": case.priority,
                    "issue_summary": case.issue_summary,
                    "opened_at": case.opened_at,
                    "closed_at": case.closed_at,
                }
            )
    service_cases.sort(key=lambda row: _timestamp(row["opened_at"]), reverse=True)

    consent_events: list[MarketingConsentEvent] = facts["consent_events"].get(partner_id, [])
    consent_evidence = [_consent_view(event) for event in reversed(consent_events)]
    latest_by_channel = {
        channel: _consent_view(event)
        for (event_partner_id, channel), event in facts["latest_consent"].items()
        if event_partner_id == partner_id
    }

    interactions: list[dict] = []
    for event in relationship_events:
        vehicle = facts["vehicles"].get(event.vehicle_id)
        interactions.append(
            {
                "kind": "VEHICLE_LIFECYCLE",
                "title": event.event_type,
                "occurred_at": event.occurred_at,
                "frame_number": vehicle.frame_number if vehicle is not None else None,
                "reference_type": event.reference_type,
                "reference_id": event.reference_id,
            }
        )
    for case in service_cases:
        interactions.append(
            {
                "kind": "SERVICE_CASE",
                "title": case["issue_summary"],
                "occurred_at": case["opened_at"],
                "frame_number": case["frame_number"],
                "reference_type": "SERVICE_CASE",
                "reference_id": case["id"],
            }
        )
    for event in consent_events:
        interactions.append(
            {
                "kind": "MARKETING_CONSENT",
                "title": f"{event.channel} {event.status}",
                "occurred_at": event.occurred_at,
                "frame_number": None,
                "reference_type": "MARKETING_CONSENT",
                "reference_id": event.id,
            }
        )
    interactions.sort(key=lambda row: _timestamp(row["occurred_at"]), reverse=True)

    return {
        "id": partner.id,
        "code": partner.code,
        "name": partner.name,
        "country_code": partner.country_code,
        "preferred_language": None,
        "email": partner.email,
        "phone": partner.phone,
        "active": partner.active,
        "lifecycle_state": "CURRENT_OWNER" if current_ids else "FORMER_OWNER",
        "current_vehicles": current_vehicles,
        "previous_vehicles": previous_vehicles,
        "service_cases": service_cases,
        "marketing": _marketing_summary(partner_id, facts["latest_consent"]),
        "marketing_channels": latest_by_channel,
        "consent_evidence": consent_evidence,
        "recent_interactions": interactions[:30],
        "communication_boundary": {
            "marketing_requires_explicit_grant": True,
            "transactional_safety_is_separate": True,
        },
    }
