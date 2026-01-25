"""
Custom exceptions for the application.
"""
from fastapi import HTTPException, status


class AzureAPIError(HTTPException):
    """Exception raised when Azure API calls fail."""

    def __init__(self, detail: str, status_code: int = status.HTTP_502_BAD_GATEWAY):
        super().__init__(status_code=status_code, detail=detail)


class AuthenticationError(HTTPException):
    """Exception raised when authentication fails."""

    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class TokenError(HTTPException):
    """Exception raised when token operations fail."""

    def __init__(self, detail: str = "Failed to obtain access token"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class ValidationError(HTTPException):
    """Exception raised when request validation fails."""

    def __init__(self, detail: str):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class ResourceNotFoundError(HTTPException):
    """Exception raised when a resource is not found."""

    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
