"""
Microsoft 365 API routes for license management and identity governance.
"""
from fastapi import APIRouter, HTTPException

from app.api.models.requests import SubscriptionRequest
from app.api.models.responses import LicenseUsageResponse, GovernanceItem
from app.core.exceptions import AzureAPIError, TokenError
from app.core.logging_config import get_logger
from app.services.azure.auth_service import AzureAuthService
from app.services.azure.license_service import LicenseService

logger = get_logger(__name__)

router = APIRouter(tags=["microsoft365"])
PRICE_MAP = {"O365_BUSINESS_ESSENTIALS": 6.00, "SPE_E3": 36.00}


@router.post("/microsoft0365/license_and_usage_details", response_model=LicenseUsageResponse)
async def get_license_and_usage_details(
    request_data: SubscriptionRequest,
) -> LicenseUsageResponse:
    """
    Get Microsoft 365 license usage and optimization details.

    Args:
        request_data: Subscription request with tenant and credentials

    Returns:
        License usage response with score, summary, and table data

    Raises:
        HTTPException: If operation fails
    """
    try:
        logger.info(f"Fetching license usage for tenant: {request_data.tenant_id}")

        # Get Graph token
        graph_token = await AzureAuthService.get_graph_token(
            tenant_id=request_data.tenant_id,
            client_id=request_data.client_id,
            client_secret=request_data.client_secret,
        )

        # Get license usage
        license_service = LicenseService(graph_token=graph_token)
        result = await license_service.get_license_usage_details()

        logger.info(f"License usage report generated with score: {result['overallScore']}%")

        return LicenseUsageResponse(**result)

    except (TokenError, AzureAPIError):
        raise
    except Exception as e:
        logger.error(f"Error fetching license usage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch license usage details")


@router.post("/microsoft0365/identity/governance", response_model=list[GovernanceItem])
async def get_identity_report(request: SubscriptionRequest) -> list[GovernanceItem]:
    """
    Get identity governance report.

    Args:
        request: Subscription request with tenant and credentials

    Returns:
        List of governance items

    Raises:
        HTTPException: If operation fails
    """
    try:
        logger.info(f"Fetching identity governance for tenant: {request.tenant_id}")

        # Get Graph token
        graph_token = await AzureAuthService.get_graph_token(
            tenant_id=request.tenant_id,
            client_id=request.client_id,
            client_secret=request.client_secret,
        )

        # Get governance report
        license_service = LicenseService(graph_token=graph_token)
        report_data = await license_service.get_identity_governance_report()

        logger.info(f"Identity governance report generated with {len(report_data)} items")

        return [GovernanceItem(**item) for item in report_data]

    except (TokenError, AzureAPIError):
        raise
    except Exception as e:
        logger.error(f"Error fetching identity governance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch identity governance report")

@router.post("/microsoft0365/secure/score")
async def get_microsoft0365_secure_score_details(request: SubscriptionRequest):
    
    # Get raw data from service layer
    try:
        logger.info(f"Fetching identity governance for tenant: {request.tenant_id}")

        # Get Graph token
        graph_token = await AzureAuthService.get_graph_token(
            tenant_id=request.tenant_id,
            client_id=request.client_id,
            client_secret=request.client_secret,
        )

        # Get governance report
        license_service = LicenseService(graph_token=graph_token)
        report_data = await license_service.get_microsoft0365_secure_score()

        logger.info(f"Identity governance report generated with {len(report_data)} items")

        return report_data

    except (TokenError, AzureAPIError):
        raise
    except Exception as e:
        logger.error(f"Error fetching identity governance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch identity governance report")
