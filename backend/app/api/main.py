"""
Main API router configuration.
"""
from fastapi import APIRouter

from app.api.routes import azure, governance, microsoft365

api_router = APIRouter()

# Register routers
api_router.include_router(azure.router)
api_router.include_router(governance.router)
api_router.include_router(microsoft365.router)
