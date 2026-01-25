"""
Request models for API endpoints.
"""
from pydantic import BaseModel, Field


class TokenRequest(BaseModel):
    """Request model for Azure token generation."""

    tenant_id: str = Field(..., description="Azure tenant ID")
    client_id: str = Field(..., description="Azure client ID")
    client_secret: str = Field(..., description="Azure client secret")
    scope: str = Field(..., description="OAuth2 scope")


class SubscriptionRequest(BaseModel):
    """Request model for subscription operations."""

    tenant_id: str = Field(..., description="Azure tenant ID")
    client_id: str = Field(..., description="Azure client ID")
    client_secret: str = Field(..., description="Azure client secret")


class UserRequest(BaseModel):
    """Request model for user operations."""

    subscription_id: str = Field(..., description="Azure subscription ID")
    tenant_id: str = Field(..., description="Azure tenant ID")
    client_id: str = Field(..., description="Azure client ID")
    client_secret: str = Field(..., description="Azure client secret")


class GovernanceRequest(BaseModel):
    """Request model for governance operations."""

    clientId: str = Field(..., alias="clientId", description="Azure client ID")
    clientSecret: str = Field(..., alias="clientSecret", description="Azure client secret")
    tenantId: str = Field(..., alias="tenantId", description="Azure tenant ID")
    subscriptionId: str = Field(..., alias="subscriptionId", description="Azure subscription ID")

    class Config:
        populate_by_name = True
