from __future__ import annotations

from cali_skg.api.cali_routes import _crm_port, app
from cali_skg.api.relationship_routes import router as relationship_intelligence_router

# Keep the legacy CALI routes intact and layer the new relationship intelligence
# API on the same FastAPI application. The relationship router is separately
# scoped and authenticated so the existing API does not need a destructive
# rewrite during the migration.
app.include_router(relationship_intelligence_router)


if __name__ == "__main__":
    import uvicorn

    # Local-first default. Deliberate LAN exposure should be configured through
    # a separate reviewed entrypoint rather than changing this bind address.
    uvicorn.run(app, host="127.0.0.1", port=_crm_port())
