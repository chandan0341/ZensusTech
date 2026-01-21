from fastapi import APIRouter

from app.api.routes import governance, azure  # Add azure to the import
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(governance.router)
api_router.include_router(azure.router)  # Register the new Azure API router
