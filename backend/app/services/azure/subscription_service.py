"""
Azure subscription service for subscription management.
"""
import httpx
from app.core.config import settings
from app.core.exceptions import AzureAPIError
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class SubscriptionService:
    """Service for Azure subscription operations."""

    @staticmethod
    async def get_subscriptions(access_token: str) -> list[dict]:
        """
        Get all Azure subscriptions for the authenticated user.

        Args:
            access_token: Azure Management API access token

        Returns:
            List of subscription dictionaries

        Raises:
            AzureAPIError: If API call fails
        """
        url = f"{settings.ARM_BASE}/subscriptions?api-version=2020-01-01"
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()

                data = response.json()
                subscriptions = data.get("value", [])

                logger.info(f"Retrieved {len(subscriptions)} subscriptions")
                return subscriptions

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching subscriptions: {e.response.status_code} - {e.response.text}")
            raise AzureAPIError(f"Failed to fetch subscriptions: HTTP {e.response.status_code}")

        except httpx.RequestError as e:
            logger.error(f"Request error fetching subscriptions: {str(e)}")
            raise AzureAPIError(f"Failed to fetch subscriptions: {str(e)}")

        except Exception as e:
            logger.error(f"Unexpected error fetching subscriptions: {str(e)}", exc_info=True)
            raise AzureAPIError(f"Failed to fetch subscriptions: {str(e)}")

    @staticmethod
    async def get_subscription_metadata(subscription_id: str, access_token: str) -> dict:
        """
        Get metadata for a specific subscription.

        Args:
            subscription_id: Azure subscription ID
            access_token: Azure Management API access token

        Returns:
            Subscription metadata dictionary

        Raises:
            AzureAPIError: If API call fails
        """
        url = f"{settings.ARM_BASE}/subscriptions/{subscription_id}?api-version=2020-01-01"
        headers = {"Authorization": f"Bearer {access_token}"}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()

                metadata = response.json()
                logger.info(f"Retrieved metadata for subscription: {subscription_id}")
                return metadata

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching subscription metadata: {e.response.status_code}")
            raise AzureAPIError(f"Failed to fetch subscription metadata: HTTP {e.response.status_code}")

        except httpx.RequestError as e:
            logger.error(f"Request error fetching subscription metadata: {str(e)}")
            raise AzureAPIError(f"Failed to fetch subscription metadata: {str(e)}")

        except Exception as e:
            logger.error(f"Unexpected error fetching subscription metadata: {str(e)}", exc_info=True)
            raise AzureAPIError(f"Failed to fetch subscription metadata: {str(e)}")
