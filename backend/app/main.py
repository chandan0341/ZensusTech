"""
Main FastAPI application entry point with Session Management.
"""
import sentry_sdk
from fastapi import FastAPI
from fastapi.routing import APIRoute
from fastapi.openapi.utils import get_openapi
from starlette.middleware.cors import CORSMiddleware
# --- NEW IMPORT ---
from starlette.middleware.sessions import SessionMiddleware 

from app.api.main import api_router
from app.api.middleware.logging_middleware import LoggingMiddleware
from app.core.config import settings
from app.core.logging_config import setup_logging

# Setup logging
setup_logging()

if settings.SENTRY_DSN and settings.ENVIRONMENT != "local":
    sentry_sdk.init(dsn=str(settings.SENTRY_DSN), enable_tracing=True)

def custom_generate_unique_id(route: APIRoute) -> str:
    return f"{route.tags[0]}-{route.name}" if route.tags else route.name

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )

    # Note: We keep BearerAuth for your internal user login, 
    # but Azure tokens will now be handled via Session Cookies.
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    for path in openapi_schema["paths"].values():
        for method in path.values():
            method.setdefault("security", []).append({"BearerAuth": []})

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    generate_unique_id_function=custom_generate_unique_id,
)

# --- 1. ADD SESSION MIDDLEWARE ---
# This enables request.session to store Graph and Management tokens in RAM.
app.add_middleware(
    SessionMiddleware, 
    secret_key=settings.SESSION_SECRET_KEY,
    session_cookie="zensus_session_id",
    max_age=3600,
    same_site="lax",
    https_only=False,
    path="/"  # <--- ADD THIS LINE explicitly
)

# --- 2. UPDATE CORS MIDDLEWARE ---
# Crucial: Origins must be explicit (no "*") when allow_credentials is True.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin).strip("/") for origin in settings.all_cors_origins],
    allow_credentials=True,                # Must be True to allow the browser to send the cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)
app.include_router(api_router, prefix=settings.API_V1_STR)
app.openapi = custom_openapi