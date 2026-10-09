from alsvid.models.assets import Asset
from alsvid.models.auth import AuthSession, UserAuthCredential
from alsvid.models.catalog import SKU, Product
from alsvid.models.commercial import (
    CommercialChannel,
    CommercialFinanceFact,
    CommercialOrderFact,
    ExportShipment,
    ShipmentMilestone,
)
from alsvid.models.core import AuditEvent, Permission, Role, RolePermission, User, UserRole
from alsvid.models.customer import MarketingConsentEvent, MyAlsvidAccount, VehicleClaimToken
from alsvid.models.dealer import DealerPortalMember, DealerProfile
from alsvid.models.engineering import (
    BicycleModel,
    BicycleVariant,
    BomItem,
    BomRevision,
    Part,
    ProductPlatform,
)
from alsvid.models.inventory import DealerInventoryReservation, InventoryLocation, InventoryMovement
from alsvid.models.partners import BusinessPartner, BusinessPartnerIdentifier, ExternalMapping
from alsvid.models.service import ServiceCase, ServiceCasePart, ServiceCaseStatusEvent, Warranty
from alsvid.models.vehicle import Vehicle, VehicleLifecycleEvent

__all__ = [
    "Asset",
    "AuditEvent",
    "AuthSession",
    "BicycleModel",
    "BicycleVariant",
    "BomItem",
    "BomRevision",
    "BusinessPartner",
    "BusinessPartnerIdentifier",
    "CommercialChannel",
    "CommercialFinanceFact",
    "CommercialOrderFact",
    "DealerInventoryReservation",
    "DealerPortalMember",
    "DealerProfile",
    "ExportShipment",
    "ExternalMapping",
    "InventoryLocation",
    "InventoryMovement",
    "MarketingConsentEvent",
    "MyAlsvidAccount",
    "Part",
    "Permission",
    "Product",
    "ProductPlatform",
    "Role",
    "RolePermission",
    "SKU",
    "ServiceCase",
    "ServiceCasePart",
    "ServiceCaseStatusEvent",
    "ShipmentMilestone",
    "User",
    "UserAuthCredential",
    "UserRole",
    "Vehicle",
    "VehicleClaimToken",
    "VehicleLifecycleEvent",
    "Warranty",
]
