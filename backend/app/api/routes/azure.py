"""
Azure API routes for authentication, subscriptions, and user management using session-based tokens.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Body, Query
from typing import Dict, Any

from app.api.models.responses import UsersResponse
from app.core.logging_config import get_logger
from app.services.azure.auth_service import AzureAuthService
from app.services.azure.subscription_service import SubscriptionService
from app.services.azure.user_service import UserService
# Import our session dependencies
from app.api.deps import get_mgmt_token, get_graph_token

logger = get_logger(__name__)
router = APIRouter(tags=["azure"])

# --- 1. Handshake Endpoint ---

@router.post("/connect")
async def connect_azure(
    credentials: dict = Body(...)
):
    auth_service = AzureAuthService()
    try:
        tenant_id = credentials.get("tenantId")
        client_id = credentials.get("clientId")
        client_secret = credentials.get("clientSecret")

        # 1. Fetch Tokens
        mgmt_data = await auth_service.get_access_token(
            tenant_id=tenant_id, client_id=client_id, client_secret=client_secret,
            scope="https://management.azure.com/.default"
        )
        graph_data = await auth_service.get_access_token(
            tenant_id=tenant_id, client_id=client_id, client_secret=client_secret,
            scope="https://graph.microsoft.com/.default"
        )

        # 2. Extract strings
        mgmt_token = mgmt_data.get("access_token") if isinstance(mgmt_data, dict) else mgmt_data
        graph_token = graph_data.get("access_token") if isinstance(graph_data, dict) else graph_data

        # 3. Return as JSON Body (No more 4KB limit!)
        return {
            "message": "Authenticated successfully",
            "mgmt_token": mgmt_token,
            "graph_token": graph_token,
            "tenant_id": tenant_id
        }
    except Exception as e:
        logger.error(f"Handshake failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Azure authentication failed")
# --- 2. Subscription Endpoints ---

@router.get("/subscriptions")
async def get_subscriptions(
    token: str = Depends(get_mgmt_token)
) -> dict:
    """
    Fetches subscriptions using the token string stored in the session.
    """
    try:
        subscriptions = await SubscriptionService.get_subscriptions(token)
        return {"value": subscriptions}
    except Exception as e:
        logger.error(f"Subscription fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscriptions")

@router.get("/subscriptions/{subscription_id}/metadata")
async def get_subscription_metadata(
    subscription_id: str,
    token: str = Depends(get_mgmt_token)
):
    """
    Proxy to get specific subscription details.
    """
    try:
        metadata = await SubscriptionService.get_subscription_details(subscription_id, token)
        return metadata
    except Exception as e:
        logger.error(f"Metadata fetch error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. User & Identity Endpoints ---

@router.get("/users", response_model=UsersResponse)
async def get_users_info(
    subscription_id: str = Query(...),
    mgmt_token: str = Depends(get_mgmt_token),
    graph_token: str = Depends(get_graph_token)
) -> UsersResponse:
    """
    Get users for a specific subscription.
    """
    try:
        user_service = UserService(graph_token=graph_token, management_token=mgmt_token)
        result = await user_service.get_subscription_users(subscription_id)
        
        return UsersResponse(
            users=result["users"],
            foreignGroupsCount=result.get("foreignGroupsCount"),
            servicePrincipalsCount=result.get("servicePrincipalsCount"),
        )
    except Exception as e:
        logger.error(f"Error fetching users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch subscription users")

@router.get("/tenant/users", response_model=UsersResponse)
async def get_tenant_users_info(
    graph_token: str = Depends(get_graph_token)
) -> UsersResponse:
    """
    Get all tenant users using the Graph token from the session.
    """
    try:
        user_service = UserService(graph_token=graph_token, management_token="")
        users = await user_service.get_tenant_users()
        
        return UsersResponse(
            users=users,
            foreignGroupsCount=None,
            servicePrincipalsCount=None,
        )
    except Exception as e:
        logger.error(f"Error fetching tenant users: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tenant users")