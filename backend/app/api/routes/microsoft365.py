"""
Microsoft 365 API routes for license management and identity governance.
"""
from fastapi import APIRouter, HTTPException, Depends

from app.api.models.responses import LicenseUsageResponse, GovernanceItem
from app.core.exceptions import AzureAPIError, TokenError
from app.core.logging_config import get_logger
from app.api.deps import get_graph_token  # New dependency for header tokens
from app.services.azure.license_service import LicenseService

logger = get_logger(__name__)

router = APIRouter(tags=["microsoft365"])

@router.get("/license_and_usage_details", response_model=LicenseUsageResponse)
async def get_license_and_usage_details(
    graph_token: str = Depends(get_graph_token)
) -> LicenseUsageResponse:
    """
    Get Microsoft 365 license usage details using header tokens.
    """
    try:

        license_service = LicenseService(graph_token=graph_token)
        result = await license_service.get_license_usage_details()

        logger.info(f"License usage report generated with score: {result['overallScore']}%")
        return LicenseUsageResponse(**result)

    except (TokenError, AzureAPIError) as e:
        logger.error(f"Azure API Error: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching license usage: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch license usage details")


@router.get("/identity/governance", response_model=list[GovernanceItem])
async def get_identity_report(
    graph_token: str = Depends(get_graph_token)
) -> list[GovernanceItem]:
    """
    Get identity governance report via GET with header tokens.
    """
    try:

        license_service = LicenseService(graph_token=graph_token)
        report_data = await license_service.get_identity_governance_report()

        logger.info(f"Identity governance report generated with {len(report_data)} items")
        return [GovernanceItem(**item) for item in report_data]

    except (TokenError, AzureAPIError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching identity governance: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch identity governance report")


@router.get("/secure/score")
async def get_microsoft0365_secure_score_details(
    graph_token: str = Depends(get_graph_token)
):
    """
    Get M365 Secure Score details via GET with header tokens.
    """
    try:

        license_service = LicenseService(graph_token=graph_token)
        report_data = await license_service.get_microsoft0365_secure_score()

        return report_data

    except (TokenError, AzureAPIError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching secure score: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch secure score details")