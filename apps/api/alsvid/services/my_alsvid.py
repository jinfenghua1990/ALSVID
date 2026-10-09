import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from alsvid.config import Settings
from alsvid.models.core import AuditEvent, Role, User, UserRole
from alsvid.models.customer import MarketingConsentEvent, MyAlsvidAccount, VehicleClaimToken
from alsvid.models.partners import BusinessPartner
from alsvid.models.vehicle import Vehicle
from alsvid.services.auth import (
    IssuedSession,
    authenticate_user,
    issue_session,
    set_user_password,
)
from alsvid.services.vehicle_lifecycle import (
    VehicleEventType,
    VehicleLifecycleError,
    record_vehicle_event,
)

CLAIM_TOKEN_TTL = timedelta(days=7)


class MyAlsvidError(ValueError):
    pass


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value.astimezone(UTC)


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _valid_claim_row(db: Session, *, token: str, for_update: bool) -> VehicleClaimToken:
    statement = select(VehicleClaimToken).where(
        VehicleClaimToken.token_hash == _token_hash(token.strip())
    )
    if for_update:
        statement = statement.with_for_update()
    claim = db.scalar(statement)
    if (
        claim is None
        or claim.claimed_at is not None
        or _as_utc(claim.expires_at) <= _now()
    ):
        raise MyAlsvidError("claim link is invalid or no longer available")
    return claim


def _claim_target(db: Session, *, token: str, for_update: bool = False) -> tuple[VehicleClaimToken, Vehicle]:
    claim = _valid_claim_row(db, token=token, for_update=for_update)
    statement = select(Vehicle).where(Vehicle.id == claim.vehicle_id)
    if for_update:
        statement = statement.with_for_update()
    vehicle = db.scalar(statement)
    if vehicle is None or vehicle.factory_outbound_at is None:
        raise MyAlsvidError("claim link is invalid or no longer available")
    return claim, vehicle


def issue_vehicle_claim_token(
    db: Session,
    *,
    vehicle: Vehicle,
    actor_id: str | None,
) -> tuple[str, datetime]:
    if vehicle.factory_outbound_at is None:
        raise MyAlsvidError("vehicle is not ready for buyer claim")

    locked = db.scalar(select(Vehicle).where(Vehicle.id == vehicle.id).with_for_update())
    if locked is None:
        raise MyAlsvidError("vehicle not found")

    if locked.current_customer_partner_id is not None:
        existing_account = db.scalar(
            select(MyAlsvidAccount.user_id)
            .where(MyAlsvidAccount.partner_id == locked.current_customer_partner_id)
            .limit(1)
        )
        if existing_account is not None:
            raise MyAlsvidError("vehicle owner already has a My ALSVID account")

    now = _now()
    active_rows = db.scalars(
        select(VehicleClaimToken).where(
            VehicleClaimToken.vehicle_id == locked.id,
            VehicleClaimToken.claimed_at.is_(None),
        )
    ).all()
    if any(_as_utc(row.expires_at) > now for row in active_rows):
        raise MyAlsvidError("an active buyer claim link already exists")

    token = secrets.token_urlsafe(48)
    expires_at = now + CLAIM_TOKEN_TTL
    db.add(
        VehicleClaimToken(
            vehicle_id=locked.id,
            token_hash=_token_hash(token),
            issued_by=actor_id,
            expires_at=expires_at,
        )
    )
    db.add(
        AuditEvent(
            actor_id=actor_id,
            action="alsvid.vehicle.claim_token.issued",
            entity_type="vehicle",
            entity_id=locked.id,
        )
    )
    db.flush()
    return token, expires_at


def _resolve_partner_for_new_account(
    db: Session,
    *,
    vehicle: Vehicle,
    email: str,
    display_name: str,
) -> BusinessPartner:
    normalized_email = email.strip().lower()
    normalized_name = display_name.strip()
    if not normalized_email or not normalized_name:
        raise MyAlsvidError("buyer email and display name are required")

    if vehicle.current_customer_partner_id is not None:
        partner = db.get(BusinessPartner, vehicle.current_customer_partner_id)
        if partner is None or not partner.active or not partner.is_customer:
            raise MyAlsvidError("vehicle owner identity requires ALSVID support review")
        if not partner.email or partner.email.strip().lower() != normalized_email:
            raise MyAlsvidError("claim email does not match the buyer recorded at handover")
        if db.scalar(
            select(MyAlsvidAccount.user_id).where(MyAlsvidAccount.partner_id == partner.id)
        ) is not None:
            raise MyAlsvidError("this buyer already has a My ALSVID account; sign in instead")
        return partner

    matches = db.scalars(
        select(BusinessPartner).where(func.lower(BusinessPartner.email) == normalized_email)
    ).all()
    if len(matches) > 1 or (matches and (not matches[0].active or not matches[0].is_customer)):
        raise MyAlsvidError("this email is linked to a business contact; ALSVID support must verify it")
    if matches:
        partner = matches[0]
        account = db.scalar(select(MyAlsvidAccount).where(MyAlsvidAccount.partner_id == partner.id))
        owned_vehicle = db.scalar(
            select(Vehicle.id).where(Vehicle.current_customer_partner_id == partner.id).limit(1)
        )
        if account is not None or owned_vehicle is not None:
            raise MyAlsvidError("this email already has a My ALSVID identity; sign in instead")
        return partner

    partner = BusinessPartner(
        code=f"MYALSVID-{secrets.token_hex(8).upper()}",
        name=normalized_name,
        email=normalized_email,
        is_customer=True,
    )
    db.add(partner)
    db.flush()
    return partner


def _consume_claim_token(
    db: Session,
    *,
    token: str,
    user: User,
    partner: BusinessPartner,
) -> Vehicle:
    claim, vehicle = _claim_target(db, token=token, for_update=True)
    now = _now()

    if vehicle.current_customer_partner_id not in {None, partner.id}:
        raise MyAlsvidError("vehicle is already linked to another buyer")

    try:
        if vehicle.current_customer_partner_id is None:
            record_vehicle_event(
                db,
                vehicle_id=vehicle.id,
                event_type=VehicleEventType.CUSTOMER_BOUND,
                actor_id=user.id,
                customer_partner_id=partner.id,
            )
        if vehicle.activated_at is None:
            record_vehicle_event(
                db,
                vehicle_id=vehicle.id,
                event_type=VehicleEventType.ACTIVATED,
                actor_id=user.id,
                dealer_partner_id=vehicle.current_dealer_partner_id,
                customer_partner_id=partner.id,
            )
    except VehicleLifecycleError as exc:
        raise MyAlsvidError("vehicle cannot be claimed") from exc

    claim.claimed_at = now
    claim.claimed_by = user.id
    db.add(
        AuditEvent(
            actor_id=user.id,
            action="alsvid.vehicle.claimed",
            entity_type="vehicle",
            entity_id=vehicle.id,
        )
    )
    db.flush()
    return vehicle


def register_buyer_and_claim(
    db: Session,
    *,
    token: str,
    email: str,
    display_name: str,
    password: str,
    settings: Settings,
    email_marketing_consent: bool = False,
    policy_version: str | None = None,
) -> tuple[User, BusinessPartner, IssuedSession]:
    normalized_email = email.strip().lower()
    if db.scalar(select(User.id).where(func.lower(User.email) == normalized_email)) is not None:
        raise MyAlsvidError("an account already uses this email; sign in to claim another vehicle")

    _, target_vehicle = _claim_target(db, token=token)
    partner = _resolve_partner_for_new_account(
        db,
        vehicle=target_vehicle,
        email=normalized_email,
        display_name=display_name,
    )
    role = db.scalar(select(Role).where(Role.code == "ALSVID_BUYER"))
    if role is None:
        raise MyAlsvidError("My ALSVID buyer role is not configured")

    user = User(email=normalized_email, display_name=display_name.strip())
    db.add(user)
    db.flush()
    db.add(UserRole(user_id=user.id, role_id=role.id))
    db.add(MyAlsvidAccount(user_id=user.id, partner_id=partner.id))
    try:
        set_user_password(db, user=user, password=password, settings=settings)
    except ValueError as exc:
        raise MyAlsvidError(str(exc)) from exc

    _consume_claim_token(db, token=token, user=user, partner=partner)
    if email_marketing_consent:
        if not policy_version or not policy_version.strip():
            raise MyAlsvidError("marketing consent requires a policy version")
        db.add(
            MarketingConsentEvent(
                partner_id=partner.id,
                channel="EMAIL",
                status="GRANTED",
                source="MY_ALSVID_CLAIM",
                policy_version=policy_version.strip(),
                occurred_at=_now(),
                recorded_by_user_id=user.id,
            )
        )
    issued = issue_session(db, user=user, settings=settings)
    return user, partner, issued


def claim_additional_vehicle(
    db: Session,
    *,
    user: User,
    partner: BusinessPartner,
    token: str,
) -> Vehicle:
    return _consume_claim_token(db, token=token, user=user, partner=partner)


def login_buyer_and_claim_vehicle(
    db: Session,
    *,
    token: str,
    email: str,
    password: str,
    settings: Settings,
) -> tuple[User, IssuedSession]:
    user = authenticate_user(db, email=email, password=password, settings=settings)
    account = db.get(MyAlsvidAccount, user.id)
    if account is None:
        raise MyAlsvidError("this account is not linked to a My ALSVID buyer")
    partner = db.get(BusinessPartner, account.partner_id)
    if partner is None or not partner.active or not partner.is_customer:
        raise MyAlsvidError("My ALSVID buyer account is unavailable")
    _consume_claim_token(db, token=token, user=user, partner=partner)
    issued = issue_session(db, user=user, settings=settings)
    return user, issued


def update_marketing_consent(
    db: Session,
    *,
    partner: BusinessPartner,
    user: User,
    granted: bool,
    policy_version: str,
) -> MarketingConsentEvent:
    normalized_policy = policy_version.strip()
    if not normalized_policy:
        raise MyAlsvidError("marketing consent requires a policy version")
    event = MarketingConsentEvent(
        partner_id=partner.id,
        channel="EMAIL",
        status="GRANTED" if granted else "WITHDRAWN",
        source="MY_ALSVID_ACCOUNT",
        policy_version=normalized_policy,
        occurred_at=_now(),
        recorded_by_user_id=user.id,
    )
    db.add(event)
    db.flush()
    return event
