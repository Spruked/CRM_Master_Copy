from __future__ import annotations

from cali_skg.api.cali_routes import _crm_port, app, verify_admin as cali_verify_admin
from cali_skg.api.communication_routes import router as communication_router
from cali_skg.api.contact_io_routes import router as contact_io_router
from cali_skg.api.csv_contact_io_routes import router as csv_contact_io_router
from cali_skg.api.dossier_backfill_routes import router as dossier_backfill_router
from cali_skg.api.identity_operations_routes import router as identity_operations_router
from cali_skg.api.operations_routes import router as operations_router
from cali_skg.api.relationship_routes import (
    router as relationship_intelligence_router,
    verify_admin as relationship_verify_admin,
)

# Keep the legacy CALI routes intact and layer the relationship/communications
# intelligence APIs onto the same local application during the migration.
app.include_router(relationship_intelligence_router)
app.include_router(communication_router)
app.include_router(contact_io_router)
app.include_router(csv_contact_io_router)
app.include_router(dossier_backfill_router)
app.include_router(operations_router)
app.include_router(identity_operations_router)


# VIV is currently a single-owner personal command station. Preserve the existing
# dependency structure so authorization can be hardened later if VIV ever becomes
# multi-user, but treat the active owner runtime as administrator by definition.
def _viv_owner_access() -> str:
    return "owner"


app.dependency_overrides[cali_verify_admin] = _viv_owner_access
app.dependency_overrides[relationship_verify_admin] = _viv_owner_access


if __name__ == "__main__":
    import uvicorn

    # Local-first default. Deliberate LAN exposure should use a separately
    # reviewed transport policy rather than changing this bind address.
    uvicorn.run(app, host="127.0.0.1", port=_crm_port())
