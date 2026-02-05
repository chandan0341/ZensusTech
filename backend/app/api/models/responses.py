"""
Response models for API endpoints.
"""
from typing import List, Optional

from pydantic import BaseModel, Field

class AzureApplication(BaseModel):
    id: str
    appId: str
    displayName: Optional[str]
    createdDateTime: Optional[str]
    signInAudience: Optional[str]

class ApplicationsResponse(BaseModel):
    applications: List[AzureApplication]
    count: int
    
class UserResponse(BaseModel):
    """User response model."""

    user: str
    principalType: Optional[str] = None
    role: str
    subscription: Optional[str] = None
    mfa: str
    lastLogin: Optional[str] = None
    status: str
    risk: str


class User(BaseModel):
    """User model for governance endpoints (simplified version)."""

    user: str
    role: str
    subscription: str
    mfa: str
    lastLogin: str
    status: str
    risk: str


class UsersResponse(BaseModel):
    """Response model for users endpoint."""

    users: List[UserResponse]
    foreignGroupsCount: Optional[int] = None
    servicePrincipalsCount: Optional[int] = None


class LicenseUsageData(BaseModel):
    """License usage data model."""

    license: str
    purchased: int
    assigned: int
    unused: int

class SummaryItem(BaseModel):
    """Executive summary item model."""

    area: str
    status: str
    color: Optional[str] = None
    number: str
    


class LicenseUsageResponse(BaseModel):
    """Response model for license usage endpoint."""

    overallScore: int
    summaryItems: List[SummaryItem]
    tableData: List[LicenseUsageData]


class GovernanceItem(BaseModel):
    """Governance item model."""

    category: str
    count: int | str


class SSLCertificate(BaseModel):
    """SSL certificate model."""

    domain: str
    expiryDate: str
    daysToExpiry: int


class AzureStats(BaseModel):
    """Azure statistics model."""

    totalUsers: int
    inactiveUsers: int
    mfaDisabled: int
    owners: int
    guestUsers: int
    highRiskFindings: int


class RiskDistribution(BaseModel):
    """Risk distribution model."""

    high: int
    medium: int
    low: int


class UserActivityTrend(BaseModel):
    """User activity trend model."""

    week: str
    signIns: int


class RoleCount(BaseModel):
    """Role count model."""

    role: str
    count: int


class InactivityPeriod(BaseModel):
    """Inactivity period model."""

    period: str
    count: int


class ExternalUser(BaseModel):
    """External user model."""

    user: str
    domain: str
    role: str
    lastLogin: str
    risk: str
