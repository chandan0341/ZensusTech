from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/governance", tags=["governance"])


class GovernanceRequest(BaseModel):
    clientId: str
    clientSecret: str
    tenantId: str
    subscriptionId: str


class AzureStats(BaseModel):
    totalUsers: int
    inactiveUsers: int
    mfaDisabled: int
    owners: int
    guestUsers: int
    highRiskFindings: int


class RiskDistribution(BaseModel):
    high: int
    medium: int
    low: int


class User(BaseModel):
    user: str
    role: str
    subscription: str
    mfa: str
    lastLogin: str
    status: str
    risk: str


class UserActivityTrend(BaseModel):
    week: str
    signIns: int


class RoleCount(BaseModel):
    role: str
    count: int


class InactivityPeriod(BaseModel):
    period: str
    count: int


class ExternalUser(BaseModel):
    user: str
    domain: str
    role: str
    lastLogin: str
    risk: str


@router.post("/stats", response_model=AzureStats)
async def get_dashboard_stats(request: GovernanceRequest) -> AzureStats:
    """
    Get Azure tenant statistics.
    This is a demo endpoint that returns mock data.
    Replace with actual Azure API calls when available.
    """
    try:
        # TODO: Implement actual Azure API calls using credentials
        # For now, returning mock data
        return AzureStats(
            totalUsers=47,
            inactiveUsers=18,
            mfaDisabled=16,
            owners=6,
            guestUsers=5,
            highRiskFindings=9,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.post("/risk-distribution", response_model=RiskDistribution)
async def get_risk_distribution(request: GovernanceRequest) -> RiskDistribution:
    """
    Get risk distribution for users in the tenant.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual risk assessment
        return RiskDistribution(
            high=35,
            medium=40,
            low=25,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch risk distribution: {str(e)}")


@router.post("/users")
async def get_users(request: GovernanceRequest) -> list[User]:
    """
    Get detailed user information for drill-down analysis.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual user data retrieval from Azure
        return [
    User(user="Rajesh P", role="Owner", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="Amit S", role="Contributor", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="John D (Guest)", role="Reader", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="Neha K", role="Owner", subscription="NonProd", mfa="Disabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Vendor-App-SP", role="Contributor", subscription="NonProd", mfa="Disabled", lastLogin="N/A", status="Active", risk="High"),
    User(user="Sunil R", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="HR-Admin", role="Owner", subscription="Both", mfa="Disabled", lastLogin="N/A", status="Active", risk="High"),
    User(user="TestUser01", role="Contributor", subscription="NonProd", mfa="Disabled", lastLogin="N/A", status="Dormant", risk="High"),
    User(user="Vinayak S", role="Contributor", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="Sachin P", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Mahesh M", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="NileshM", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Umesh S", role="Contributor", subscription="Prod-ERP", mfa="Enabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="Ramesh S", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Sidhant S", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Sidhi S", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Deepali S", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Ronin K", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Shaiendra Jain", role="Contributor", subscription="Prod-ERP", mfa="Enabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="Shubham P", role="Owner", subscription="Both", mfa="Enabled", lastLogin="N/A", status="Active", risk="High"),
    User(user="Pooja A", role="Owner", subscription="Both", mfa="Enabled", lastLogin="N/A", status="Active", risk="High"),
    User(user="Fieona F", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Anne Thomas", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Sandy P", role="Contributor", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="Ramakant T", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Amitabh K", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Ankan K", role="Contributor", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="Sudhant B", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Rohit S", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Sivakumar T", role="Owner", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="Vivek l", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Rajanish G", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Mahendra P", role="Contributor", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Active", risk="Medium"),
    User(user="Mosine M", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Michele T", role="Owner", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Active", risk="Low"),
    User(user="Rohan P", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Kush S", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="App_Admin", role="Owner", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="DB_admin", role="Owner", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="Testing_123", role="Owner", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="Rest_users_30days", role="Owner", subscription="Prod-ERP", mfa="Disabled", lastLogin="N/A", status="Inactive", risk="High"),
    User(user="Kunal P", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Jignesh T", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Ashish P", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Romy F", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Priya A", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
    User(user="Chandan S", role="Reader", subscription="NonProd", mfa="Enabled", lastLogin="N/A", status="Inactive", risk="Medium"),
]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch user data: {str(e)}")


@router.post("/user-activity-trend")
async def get_user_activity_trend(request: GovernanceRequest) -> list[UserActivityTrend]:
    """
    Get user activity trend data for charting.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual activity data retrieval
        return [
            UserActivityTrend(week="Week 1", signIns=145),
            UserActivityTrend(week="Week 2", signIns=182),
            UserActivityTrend(week="Week 3", signIns=168),
            UserActivityTrend(week="Week 4", signIns=195),
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch activity trend: {str(e)}")


@router.post("/role-counts")
async def get_role_counts(request: GovernanceRequest) -> list[RoleCount]:
    """
    Get role distribution counts for the subscription.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual role count retrieval from Azure
        # Mock data based on subscription ID to simulate different data for different subscriptions
        base_data = [
            RoleCount(role="Owner", count=3),
            RoleCount(role="Contributor", count=12),
            RoleCount(role="Reader", count=25),
            RoleCount(role="User Access Administrator", count=2),
            RoleCount(role="Security Admin", count=1),
        ]

        # Simulate different data based on subscription ID
        if "Prod-ERP-Azure-UK" in request.subscriptionId:
            return [
                RoleCount(role="Owner", count=3),
                RoleCount(role="Contributor", count=9),
                RoleCount(role="Reader", count=6),
                RoleCount(role="Guest", count=2),
            ]
        elif "NonProd-Apps-India" in request.subscriptionId:
            return [
                RoleCount(role="Owner", count=3),
                RoleCount(role="Contributor", count=14),
                RoleCount(role="Reader", count=5),
                RoleCount(role="Guest", count=3),
            ]
        else:
            return base_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch role counts: {str(e)}")


@router.post("/inactivity-analysis")
async def get_inactivity_analysis(request: GovernanceRequest) -> list[InactivityPeriod]:
    """
    Get inactivity analysis data.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual inactivity analysis from Azure
        return [
            InactivityPeriod(period="< 30 days", count=29),
            InactivityPeriod(period="30–60 days", count=8),
            InactivityPeriod(period="60–90 days", count=4),
            InactivityPeriod(period="> 90 days", count=6),
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch inactivity analysis: {str(e)}")


@router.post("/external-users")
async def get_external_users(request: GovernanceRequest) -> list[ExternalUser]:
    """
    Get external users data.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual external users retrieval from Azure
        return [
            ExternalUser(
                user="john@vendor.com",
                domain="External",
                role="Reader",
                lastLogin="121 days",
                risk="Critical"
            ),
            ExternalUser(
                user="app@partner.io",
                domain="External",
                role="Contributor",
                lastLogin="63 days",
                risk="High"
            ),
            ExternalUser(
                user="audit@consultant.com",
                domain="External",
                role="Reader",
                lastLogin="15 days",
                risk="Low"
            ),
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch external users: {str(e)}")


class SSLCertificate(BaseModel):
    domain: str
    expiryDate: str  # ISO date string
    daysToExpiry: int

@router.post("/ssl-certificates")
async def get_ssl_certificates(request: GovernanceRequest) -> list[SSLCertificate]:
    """
    Get SSL certificate expiry data (mock).
    """
    try:
        return [
            SSLCertificate(domain="example.com", expiryDate="2026-02-20", daysToExpiry=30),
            SSLCertificate(domain="company.net", expiryDate="2026-01-25", daysToExpiry=4),
            SSLCertificate(domain="brand.org", expiryDate="2026-03-30", daysToExpiry=69),
            SSLCertificate(domain="portal.io", expiryDate="2026-01-29", daysToExpiry=8),
            SSLCertificate(domain="safe-site.com", expiryDate="2026-04-15", daysToExpiry=85),
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch SSL certificate data: {str(e)}")
