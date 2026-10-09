import secrets
import time

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

# Prefixes that already identify ALSVID-owned or required canonical records in
# the source system are intentionally preserved so extraction does not require
# changing stable IDs merely because the repository boundary changed.
_PREFIXES = {
    "user": "usr",
    "auth_session": "ses",
    "role": "role",
    "permission": "perm",
    "partner": "bp",
    "partner_identifier": "bpi",
    "product": "prd",
    "sku": "sku",
    "platform": "plt",
    "model": "mdl",
    "variant": "var",
    "part": "part",
    "bom_revision": "bomr",
    "vehicle": "veh",
    "vehicle_event": "vev",
    "warranty": "war",
    "service_case": "svc",
    "service_case_part": "scp",
    "service_status_event": "sse",
    "asset": "ast",
    "vehicle_claim_token": "vct",
    "marketing_consent_event": "mce",
    "dealer_portal_member": "dpm",
    "external_mapping": "ext",
    "audit_event": "aud",
}


def _encode_base32(value: int, length: int) -> str:
    chars: list[str] = []
    for _ in range(length):
        chars.append(_CROCKFORD[value & 31])
        value >>= 5
    return "".join(reversed(chars))


def new_id(kind: str) -> str:
    try:
        prefix = _PREFIXES[kind]
    except KeyError as exc:
        raise ValueError(f"unknown ALSVID ID kind: {kind}") from exc
    timestamp_ms = int(time.time() * 1000)
    random_bits = secrets.randbits(80)
    return f"{prefix}_{_encode_base32((timestamp_ms << 80) | random_bits, 26)}"


def is_alsvid_id(value: str, kind: str | None = None) -> bool:
    if "_" not in value:
        return False
    prefix, ulid = value.split("_", 1)
    if kind is not None and prefix != _PREFIXES.get(kind):
        return False
    return prefix in _PREFIXES.values() and len(ulid) == 26 and all(c in _CROCKFORD for c in ulid)


def registered_prefixes() -> dict[str, str]:
    return dict(_PREFIXES)
