from __future__ import annotations

from cali_skg.api.cali_routes import _crm_port, app
from cali_skg.api.communication_routes import router as communication_router
from cali_skg.api.contact_io_routes import router as contact_io_router
from cali_skg.api.identity_operations_routes import router as identity_operations_router
from cali_skg.api.operations_routes import router as operations_router
from cali_skg.api.relationship_routes import router as relationship_intelligence_router

# Keep the legacy CALI routes intact and layer the relationship/communications
# intelligence APIs onto the same local application during the migration.
app.include_router(relationship_intelligence_router)
app.include_router(communication_router)
app.include_router(contact_io_router)
app.include_router(operations_router)
app.include_router(identity_operations_router)


if __name__ == "__main__":
    import uvicorn

    # Local-first default. Deliberate LAN exposure should use a separately
    # reviewed transport policy rather than changing this bind address.
    uvicorn.run(app, host="127.0.0.1", port=_crm_port())
