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


@router.post("/users/drilldown")
async def get_user_drilldown(request: GovernanceRequest) -> list[User]:
    """
    Get detailed user information for drill-down analysis.
    This is a demo endpoint that returns mock data.
    """
    try:
        # TODO: Implement actual user data retrieval from Azure
        return [
            User(
                user="john.doe@contoso.com",
                role="Owner",
                subscription="Production",
                mfa="Enabled",
                lastLogin="2024-01-15",
                status="Active",
                risk="Low",
            ),
            User(
                user="jane.smith@contoso.com",
                role="Contributor",
                subscription="Production",
                mfa="Disabled",
                lastLogin="2024-01-10",
                status="Active",
                risk="High",
            ),
            User(
                user="bob.wilson@contoso.com",
                role="Reader",
                subscription="Production",
                mfa="Enabled",
                lastLogin="2024-01-18",
                status="Active",
                risk="Medium",
            ),
            User(
                user="alice.johnson@contoso.com",
                role="User Access Administrator",
                subscription="Production",
                mfa="Enabled",
                lastLogin="2024-01-12",
                status="Inactive",
                risk="Low",
            ),
            User(
                user="charlie.brown@contoso.com",
                role="Security Admin",
                subscription="Production",
                mfa="Disabled",
                lastLogin="2024-01-05",
                status="Active",
                risk="Medium",
            ),
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
