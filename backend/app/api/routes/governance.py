"""
Governance API routes for dashboard statistics and SSL certificates.
"""
from fastapi import APIRouter, HTTPException

from app.api.models.requests import GovernanceRequest
from app.api.models.responses import (
    AzureStats,
    RiskDistribution,
    User,
    UserActivityTrend,
    RoleCount,
    InactivityPeriod,
    ExternalUser,
    SSLCertificate,
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/governance", tags=["governance"])


@router.post("/stats", response_model=AzureStats)
async def get_dashboard_stats(request: GovernanceRequest) -> AzureStats:
    """
    Get Azure tenant statistics.

    Note: This is a demo endpoint that returns mock data.
    Replace with actual Azure API calls when available.

    Args:
        request: Governance request with credentials

    Returns:
        Azure statistics
    """
    try:
        logger.info(f"Fetching dashboard stats for tenant: {request.tenantId}")
        # TODO: Implement actual Azure API calls using credentials
        return AzureStats(
            totalUsers=47,
            inactiveUsers=18,
            mfaDisabled=16,
            owners=6,
            guestUsers=5,
            highRiskFindings=9,
        )
    except Exception as e:
        logger.error(f"Error fetching stats: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch stats: {str(e)}")


@router.post("/risk-distribution", response_model=RiskDistribution)
async def get_risk_distribution(request: GovernanceRequest) -> RiskDistribution:
    """
    Get risk distribution for users in the tenant.

    Note: This is a demo endpoint that returns mock data.

    Args:
        request: Governance request with credentials

    Returns:
        Risk distribution
    """
    try:
        logger.info(f"Fetching risk distribution for tenant: {request.tenantId}")
        # TODO: Implement actual risk assessment
        return RiskDistribution(high=35, medium=40, low=25)
    except Exception as e:
        logger.error(f"Error fetching risk distribution: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch risk distribution: {str(e)}"
        )


@router.post("/users", response_model=list[User])
async def get_users(request: GovernanceRequest) -> list[User]:
    """
    Get detailed user information for drill-down analysis.

    Note: This is a demo endpoint that returns mock data.
    Replace with actual user data retrieval from Azure.

    Args:
        request: Governance request with credentials

    Returns:
        List of users
    """
    try:
        logger.info(f"Fetching users for tenant: {request.tenantId}")
        # TODO: Implement actual user data retrieval from Azure
        # Mock data for demonstration
        mock_users = [
            User(
                user="Rajesh P",
                role="Owner",
                subscription="Prod-ERP",
                mfa="Disabled",
                lastLogin="N/A",
                status="Inactive",
                risk="High",
            ),
            User(
                user="Amit S",
                role="Contributor",
                subscription="Prod-ERP",
                mfa="Disabled",
                lastLogin="N/A",
                status="Active",
                risk="Medium",
            ),
            # Add more mock users as needed
        ]
        return mock_users
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch user data: {str(e)}")


@router.post("/user-activity-trend", response_model=list[UserActivityTrend])
async def get_user_activity_trend(
    request: GovernanceRequest,
) -> list[UserActivityTrend]:
    """
    Get user activity trend data for charting.

    Note: This is a demo endpoint that returns mock data.

    Args:
        request: Governance request with credentials

    Returns:
        List of activity trends
    """
    try:
        logger.info(f"Fetching activity trend for tenant: {request.tenantId}")
        # TODO: Implement actual activity data retrieval
        return [
            UserActivityTrend(week="Week 1", signIns=145),
            UserActivityTrend(week="Week 2", signIns=182),
            UserActivityTrend(week="Week 3", signIns=168),
            UserActivityTrend(week="Week 4", signIns=195),
        ]
    except Exception as e:
        logger.error(f"Error fetching activity trend: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch activity trend: {str(e)}"
        )


@router.post("/role-counts", response_model=list[RoleCount])
async def get_role_counts(request: GovernanceRequest) -> list[RoleCount]:
    """
    Get role distribution counts for the subscription.

    Note: This is a demo endpoint that returns mock data.

    Args:
        request: Governance request with credentials

    Returns:
        List of role counts
    """
    try:
        logger.info(f"Fetching role counts for subscription: {request.subscriptionId}")
        # TODO: Implement actual role count retrieval from Azure
        # Mock data based on subscription ID
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
            return [
                RoleCount(role="Owner", count=3),
                RoleCount(role="Contributor", count=12),
                RoleCount(role="Reader", count=25),
                RoleCount(role="User Access Administrator", count=2),
                RoleCount(role="Security Admin", count=1),
            ]
    except Exception as e:
        logger.error(f"Error fetching role counts: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch role counts: {str(e)}"
        )


@router.post("/inactivity-analysis", response_model=list[InactivityPeriod])
async def get_inactivity_analysis(
    request: GovernanceRequest,
) -> list[InactivityPeriod]:
    """
    Get inactivity analysis data.

    Note: This is a demo endpoint that returns mock data.

    Args:
        request: Governance request with credentials

    Returns:
        List of inactivity periods
    """
    try:
        logger.info(f"Fetching inactivity analysis for tenant: {request.tenantId}")
        # TODO: Implement actual inactivity analysis from Azure
        return [
            InactivityPeriod(period="< 30 days", count=29),
            InactivityPeriod(period="30–60 days", count=8),
            InactivityPeriod(period="60–90 days", count=4),
            InactivityPeriod(period="> 90 days", count=6),
        ]
    except Exception as e:
        logger.error(f"Error fetching inactivity analysis: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch inactivity analysis: {str(e)}"
        )


@router.post("/external-users", response_model=list[ExternalUser])
async def get_external_users(request: GovernanceRequest) -> list[ExternalUser]:
    """
    Get external users data.

    Note: This is a demo endpoint that returns mock data.

    Args:
        request: Governance request with credentials

    Returns:
        List of external users
    """
    try:
        logger.info(f"Fetching external users for tenant: {request.tenantId}")
        # TODO: Implement actual external users retrieval from Azure
        return [
            ExternalUser(
                user="john@vendor.com",
                domain="External",
                role="Reader",
                lastLogin="121 days",
                risk="Critical",
            ),
            ExternalUser(
                user="app@partner.io",
                domain="External",
                role="Contributor",
                lastLogin="63 days",
                risk="High",
            ),
            ExternalUser(
                user="audit@consultant.com",
                domain="External",
                role="Reader",
                lastLogin="15 days",
                risk="Low",
            ),
        ]
    except Exception as e:
        logger.error(f"Error fetching external users: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch external users: {str(e)}"
        )


@router.post("/ssl-certificates", response_model=list[SSLCertificate])
async def get_ssl_certificates(request: GovernanceRequest) -> list[SSLCertificate]:
    """
    Get SSL certificate expiry data.

    Note: This is a demo endpoint that returns mock data.
    Replace with actual SSL certificate checking when available.

    Args:
        request: Governance request with credentials

    Returns:
        List of SSL certificates
    """
    try:
        logger.info(f"Fetching SSL certificates for tenant: {request.tenantId}")
        # TODO: Implement actual SSL certificate checking
        return [
            SSLCertificate(domain="example.com", expiryDate="2026-02-20", daysToExpiry=30),
            SSLCertificate(domain="company.net", expiryDate="2026-01-25", daysToExpiry=4),
            SSLCertificate(domain="brand.org", expiryDate="2026-03-30", daysToExpiry=69),
            SSLCertificate(domain="portal.io", expiryDate="2026-01-29", daysToExpiry=8),
            SSLCertificate(domain="safe-site.com", expiryDate="2026-04-15", daysToExpiry=85),
        ]
    except Exception as e:
        logger.error(f"Error fetching SSL certificates: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch SSL certificate data: {str(e)}"
        )
