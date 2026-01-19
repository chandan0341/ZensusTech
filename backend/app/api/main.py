from fastapi import APIRouter

from app.api.routes import governance
from app.core.config import settings

api_router = APIRouter()

api_router.include_router(governance.router)
