"""
Main API router configuration.
"""
from fastapi import APIRouter
from app.api.routes import azure, governance, microsoft365

api_router = APIRouter()

# Register routers
# We add the prefix "/auth" here so the routes in azure.py 
# (like /connect) become /api/v1/auth/connect
api_router.include_router(azure.router, tags=["auth"])
api_router.include_router(governance.router, prefix="/governance", tags=["governance"])
api_router.include_router(microsoft365.router, prefix="/microsoft0365", tags=["microsoft365"])

# These can keep their own prefixes as well
