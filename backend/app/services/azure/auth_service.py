"""
Azure authentication service for token management.
"""
import httpx
from app.core.exceptions import TokenError
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AzureAuthService:
    """Service for Azure authentication operations."""

    @staticmethod
    async def get_access_token(
        tenant_id: str,
        client_id: str,
        client_secret: str,
        scope: str,
    ) -> str:
        """
        Get Azure access token using client credentials flow.
        """
        url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

        # Using x-www-form-urlencoded as required by Microsoft OAuth2
        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
            "scope": scope,
        }

        headers = {"Content-Type": "application/x-www-form-urlencoded"}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(url, data=data, headers=headers)
                
                # Check for HTTP errors (4xx, 5xx)
                if response.is_error:
                    # Log the error but NEVER the 'data' dictionary (it contains the secret)
                    logger.error(f"Azure Auth Failed: {response.status_code} - {response.text}")
                    raise TokenError(f"Azure authentication failed with status {response.status_code}")

                token_data = response.json()
                access_token = token_data.get("access_token")

                if not access_token:
                    raise TokenError("Auth response successful but access_token is missing")

                logger.info(f"Successfully obtained on-the-fly token for scope: {scope}")
                return access_token

        except httpx.RequestError as e:
            logger.error(f"Network error connecting to Azure: {str(e)}")
            raise TokenError("Could not reach Microsoft identity servers")
        except Exception as e:
            # General catch-all to prevent the app from crashing
            logger.error("Unexpected error during Azure token exchange")
            raise TokenError("An internal error occurred during authentication")

    @staticmethod
    async def get_graph_token(
        tenant_id: str,
        client_id: str,
        client_secret: str,
    ) -> str:
        """Get Microsoft Graph API access token (Identity/MFA/Users)."""
        return await AzureAuthService.get_access_token(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
            scope="https://graph.microsoft.com/.default",
        )

    @staticmethod
    async def get_management_token(
        tenant_id: str,
        client_id: str,
        client_secret: str,
    ) -> str:
        """Get Azure Management API access token (Subscriptions/Resources)."""
        return await AzureAuthService.get_access_token(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
            scope="https://management.azure.com/.default",
        )