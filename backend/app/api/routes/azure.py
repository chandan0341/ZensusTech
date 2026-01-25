"""
Azure API routes for authentication, subscriptions, and user management.
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.api.models.requests import TokenRequest, SubscriptionRequest, UserRequest
from app.api.models.responses import UsersResponse
from app.core.exceptions import AzureAPIError, TokenError
from app.core.logging_config import get_logger
from app.services.azure.auth_service import AzureAuthService
from app.services.azure.subscription_service import SubscriptionService
from app.services.azure.user_service import UserService

logger = get_logger(__name__)

router = APIRouter(tags=["azure"])
bearer_scheme = HTTPBearer()


@router.post("/azure/token")
async def get_token(request: TokenRequest) -> dict:
    """
    Get Azure access token.

    Args:
        request: Token request with tenant, client credentials, and scope

    Returns:
        Token response with access_token

    Raises:
        TokenError: If token acquisition fails
    """
    try:
        logger.info(f"Token request for tenant: {request.tenant_id}, scope: {request.scope}")
        token = await AzureAuthService.get_access_token(
            tenant_id=request.tenant_id,
            client_id=request.client_id,
            client_secret=request.client_secret,
            scope=request.scope,
        )
        return {"access_token": token}
    except TokenError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in token endpoint: {str(e)}", exc_info=True)
        raise TokenError("Failed to obtain access token")


@router.get("/azure/subscriptions")
async def get_subscriptions(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    """
    Get Azure subscriptions.

    Args:
        credentials: Bearer token credentials

    Returns:
        Subscriptions response

    Raises:
        AzureAPIError: If API call fails
    """
    try:
        logger.info("Fetching subscriptions")
        access_token = credentials.credentials
        subscriptions = await SubscriptionService.get_subscriptions(access_token)
        return {"value": subscriptions}
    except AzureAPIError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error fetching subscriptions: {str(e)}", exc_info=True)
        raise AzureAPIError("Failed to fetch subscriptions")


@router.post("/azure/users", response_model=UsersResponse)
async def get_users_info(request_data: UserRequest) -> UsersResponse:
    """
    Get users with role assignments for a subscription.

    Args:
        request_data: User request with subscription and credentials

    Returns:
        Users response with users list and counts

    Raises:
        HTTPException: If operation fails
    """
    try:
        logger.info(f"Fetching users for subscription: {request_data.subscription_id}")

        # Get tokens
        graph_token = await AzureAuthService.get_graph_token(
            tenant_id=request_data.tenant_id,
            client_id=request_data.client_id,
            client_secret=request_data.client_secret,
        )

        mgmt_token = await AzureAuthService.get_management_token(
            tenant_id=request_data.tenant_id,
            client_id=request_data.client_id,
            client_secret=request_data.client_secret,
        )

        # Get users
        user_service = UserService(graph_token=graph_token, management_token=mgmt_token)
        result = await user_service.get_subscription_users(request_data.subscription_id)

        logger.info(
            f"Retrieved {len(result['users'])} users, "
            f"SP count: {result['servicePrincipalsCount']}, "
            f"FG count: {result['foreignGroupsCount']}"
        )

        return UsersResponse(
            users=result["users"],
            foreignGroupsCount=result.get("foreignGroupsCount"),
            servicePrincipalsCount=result.get("servicePrincipalsCount"),
        )

    except (TokenError, AzureAPIError):
        raise
    except Exception as e:
        logger.error(f"Error fetching subscription users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch subscription users")


@router.post("/azure/tenant/users", response_model=UsersResponse)
async def get_tenant_users_info(request_data: SubscriptionRequest) -> UsersResponse:
    """
    Get all users from the tenant.

    Args:
        request_data: Subscription request with tenant and credentials

    Returns:
        Users response with tenant users

    Raises:
        HTTPException: If operation fails
    """
    try:
        logger.info(f"Fetching tenant users for tenant: {request_data.tenant_id}")

        # Get Graph token
        graph_token = await AzureAuthService.get_graph_token(
            tenant_id=request_data.tenant_id,
            client_id=request_data.client_id,
            client_secret=request_data.client_secret,
        )

        # Get tenant users
        user_service = UserService(graph_token=graph_token, management_token="")
        users = await user_service.get_tenant_users()

        logger.info(f"Retrieved {len(users)} tenant users")

        return UsersResponse(
            users=users,
            foreignGroupsCount=None,
            servicePrincipalsCount=None,
        )

    except (TokenError, AzureAPIError):
        raise
    except Exception as e:
        logger.error(f"Error fetching tenant users: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch tenant users")
