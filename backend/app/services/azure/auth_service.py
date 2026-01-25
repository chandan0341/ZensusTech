"""
Azure authentication service for token management.
"""
import httpx
from app.core.config import settings
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

        Args:
            tenant_id: Azure tenant ID
            client_id: Azure client ID
            client_secret: Azure client secret
            scope: OAuth2 scope

        Returns:
            Access token string

        Raises:
            TokenError: If token acquisition fails
        """
        url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

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
                response.raise_for_status()

                token_data = response.json()
                access_token = token_data.get("access_token")

                if not access_token:
                    logger.error("Token response missing access_token")
                    raise TokenError("Failed to obtain access token: missing token in response")

                logger.info(f"Successfully obtained access token for scope: {scope}")
                return access_token

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error obtaining token: {e.response.status_code} - {e.response.text}")
            raise TokenError(f"Failed to obtain access token: HTTP {e.response.status_code}")

        except httpx.RequestError as e:
            logger.error(f"Request error obtaining token: {str(e)}")
            raise TokenError(f"Failed to obtain access token: {str(e)}")

        except Exception as e:
            logger.error(f"Unexpected error obtaining token: {str(e)}", exc_info=True)
            raise TokenError(f"Failed to obtain access token: {str(e)}")

    @staticmethod
    async def get_graph_token(
        tenant_id: str,
        client_id: str,
        client_secret: str,
    ) -> str:
        """
        Get Microsoft Graph API access token.

        Args:
            tenant_id: Azure tenant ID
            client_id: Azure client ID
            client_secret: Azure client secret

        Returns:
            Graph API access token
        """
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
        """
        Get Azure Management API access token.

        Args:
            tenant_id: Azure tenant ID
            client_id: Azure client ID
            client_secret: Azure client secret

        Returns:
            Management API access token
        """
        return await AzureAuthService.get_access_token(
            tenant_id=tenant_id,
            client_id=client_id,
            client_secret=client_secret,
            scope="https://management.azure.com/.default",
        )
