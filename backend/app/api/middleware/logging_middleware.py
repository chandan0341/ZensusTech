"""
Request logging middleware for FastAPI.
"""
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process request and log details.

        Args:
            request: FastAPI request object
            call_next: Next middleware or route handler

        Returns:
            Response object
        """
        start_time = time.time()

        # Log request
        client_ip = request.client.host if request.client else "unknown"
        method = request.method
        path = request.url.path
        query_params = str(request.query_params) if request.query_params else ""

        logger.info(
            f"Request: {method} {path} | "
            f"Query: {query_params} | "
            f"Client IP: {client_ip}"
        )

        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time

            # Log response
            logger.info(
                f"Response: {method} {path} | "
                f"Status: {response.status_code} | "
                f"Time: {process_time:.3f}s"
            )

            return response

        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Error: {method} {path} | "
                f"Time: {process_time:.3f}s | "
                f"Error: {str(e)}",
                exc_info=True,
            )
            raise
