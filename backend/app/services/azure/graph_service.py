"""
Microsoft Graph API service for user and identity operations.
"""
import httpx
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from app.core.config import settings
from app.core.exceptions import AzureAPIError
from app.core.logging_config import get_logger

logger = get_logger(__name__)


class GraphService:
    """Service for Microsoft Graph API operations."""

    def __init__(self, access_token: str):
        """
        Initialize Graph service with access token.

        Args:
            access_token: Microsoft Graph API access token
        """
        self.access_token = access_token
        self.headers = {"Authorization": f"Bearer {access_token}"}
        self.base_url = settings.GRAPH_BASE

    async def _execute_batch_request(
        self,
        client: httpx.AsyncClient,
        batch_requests: List[Dict],
    ) -> Dict[str, Dict]:
        """
        Execute a batch request to Microsoft Graph API.

        Args:
            client: HTTP client instance
            batch_requests: List of batch request dictionaries

        Returns:
            Dictionary mapping request IDs to responses
        """
        url = f"{self.base_url}/$batch"
        payload = {"requests": batch_requests}

        try:
            response = await client.post(
                url,
                json=payload,
                headers={**self.headers, "Content-Type": "application/json"},
            )
            response.raise_for_status()

            responses = response.json().get("responses", [])
            return {res["id"]: res for res in responses if res.get("status") == 200}

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error in batch request: {e.response.status_code}")
            raise AzureAPIError(f"Batch request failed: HTTP {e.response.status_code}")

        except Exception as e:
            logger.error(f"Error executing batch request: {str(e)}", exc_info=True)
            raise AzureAPIError(f"Batch request failed: {str(e)}")

    async def get_users(
        self,
        select_fields: Optional[List[str]] = None,
        top: int = 999,
    ) -> List[Dict]:
        """
        Get all users from the tenant.

        Args:
            select_fields: List of fields to select
            top: Maximum number of results per page

        Returns:
            List of user dictionaries
        """
        default_fields = ["id", "displayName", "userPrincipalName", "userType", "accountEnabled"]
        select = ",".join(select_fields or default_fields)
        url = f"{self.base_url}/users?$select={select}&$top={top}"

        all_users = []

        async with httpx.AsyncClient(timeout=60.0) as client:
            while url:
                try:
                    response = await client.get(url, headers=self.headers)
                    response.raise_for_status()

                    data = response.json()
                    users_chunk = data.get("value", [])
                    all_users.extend(users_chunk)

                    url = data.get("@odata.nextLink")
                    if url and not url.startswith("http"):
                        url = f"{self.base_url}{url}"

                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error fetching users: {e.response.status_code}")
                    raise AzureAPIError(f"Failed to fetch users: HTTP {e.response.status_code}")

                except Exception as e:
                    logger.error(f"Error fetching users: {str(e)}", exc_info=True)
                    raise AzureAPIError(f"Failed to fetch users: {str(e)}")

        logger.info(f"Retrieved {len(all_users)} users from tenant")
        return all_users

    async def get_user_mfa_status(self, user_id: str) -> bool:
        """
        Check if MFA is enabled for a user.

        Args:
            user_id: User ID

        Returns:
            True if MFA is enabled, False otherwise
        """
        url = f"{self.base_url}/users/{user_id}/authentication/methods"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                methods = response.json().get("value", [])
                # MFA is enabled if there's any method other than password
                mfa_enabled = any(
                    m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod"
                    for m in methods
                )

                return mfa_enabled

            except httpx.HTTPStatusError:
                logger.warning(f"Could not fetch MFA status for user {user_id}")
                return False

            except Exception as e:
                logger.error(f"Error checking MFA status for user {user_id}: {str(e)}")
                return False

    async def get_user_roles(self, user_id: str) -> List[str]:
        """
        Get directory roles for a user.

        Args:
            user_id: User ID

        Returns:
            List of role display names
        """
        url = f"{self.base_url}/users/{user_id}/memberOf?$select=displayName"

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                member_of = response.json().get("value", [])
                roles = [
                    item.get("displayName")
                    for item in member_of
                    if item.get("@odata.type") == "#microsoft.graph.directoryRole"
                    and item.get("displayName") is not None
                ]

                return roles

            except httpx.HTTPStatusError:
                logger.warning(f"Could not fetch roles for user {user_id}")
                return []

            except Exception as e:
                logger.error(f"Error fetching roles for user {user_id}: {str(e)}")
                return []

    async def get_identity_governance_data(self) -> Optional[Dict]:
        """
        Get identity governance statistics.

        Returns:
            Dictionary with governance statistics or None if failed
        """
        url = f"{self.base_url}/users?$select=id,displayName,userType,signInActivity,assignedLicenses"

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                users = response.json().get("value", [])
                threshold_date = datetime.now(timezone.utc) - timedelta(days=30)

                total_users = len(users)
                guest_users = sum(1 for u in users if u.get("userType") == "Guest")
                inactive_users = 0

                for user in users:
                    activity = user.get("signInActivity")
                    if activity:
                        last_login_str = activity.get("lastSignInDateTime")
                        if last_login_str:
                            try:
                                last_login = datetime.fromisoformat(
                                    last_login_str.replace("Z", "+00:00")
                                )
                                if last_login < threshold_date:
                                    inactive_users += 1
                            except (ValueError, AttributeError):
                                inactive_users += 1
                    else:
                        inactive_users += 1

                return {
                    "total": total_users,
                    "guests": guest_users,
                    "inactive": inactive_users,
                    "active": total_users - inactive_users,
                }

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching governance data: {e.response.status_code}")
                return None

            except Exception as e:
                logger.error(f"Error fetching governance data: {str(e)}", exc_info=True)
                return None

    async def get_privileged_user_count(self) -> int:
        """
        Count users with directory roles (privileged users).

        Returns:
            Number of privileged users
        """
        url = f"{self.base_url}/directoryRoles?$expand=members"

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                roles = response.json().get("value", [])
                privileged_user_ids = set()

                for role in roles:
                    for member in role.get("members", []):
                        privileged_user_ids.add(member.get("id"))

                count = len(privileged_user_ids)
                logger.info(f"Found {count} privileged users")
                return count

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error fetching privileged users: {e.response.status_code}")
                return 0

            except Exception as e:
                logger.error(f"Error fetching privileged users: {str(e)}", exc_info=True)
                return 0

    async def get_secure_score(self) -> int:
        """
        Get Microsoft Secure Score.

        Returns:
            Secure score as percentage (0-100)
        """
        url = f"{self.base_url}/security/secureScores?$top=1"

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                data = response.json().get("value", [])
                if data:
                    current = data[0].get("currentScore", 0)
                    max_score = data[0].get("maxScore", 1)
                    score = round((current / max_score) * 100)
                    logger.info(f"Secure score: {score}%")
                    return score

                return 0

            except httpx.HTTPStatusError as e:
                logger.warning(f"Could not fetch secure score: {e.response.status_code}")
                return 0

            except Exception as e:
                logger.error(f"Error fetching secure score: {str(e)}")
                return 0

    async def get_email_security_status(self) -> Dict[str, str]:
        """
        Get email security status.

        Returns:
            Dictionary with status and color
        """
        url = (
            f"{self.base_url}/security/alerts"
            "?$filter=category eq 'Email' and status eq 'newActive'&$top=5"
        )

        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                response = await client.get(url, headers=self.headers)
                response.raise_for_status()

                alerts = response.json().get("value", [])

                if not alerts:
                    return {"status": "Good", "color": "green"}

                has_high_risk = any(a.get("severity") == "high" for a in alerts)
                if has_high_risk:
                    return {"status": "High Risk", "color": "red"}

                return {"status": "Needs Improvement", "color": "orange"}

            except httpx.HTTPStatusError:
                logger.warning("Could not fetch email security status")
                return {"status": "Good", "color": "green"}

            except Exception as e:
                logger.error(f"Error fetching email security status: {str(e)}")
                return {"status": "Good", "color": "green"}

    async def get_license_and_usage(self) -> tuple[List[Dict], Optional[List[Dict]], bool]:
        """
        Get license SKUs and usage data.

        Returns:
            Tuple of (SKUs list, usage data list or None, success flag)
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch SKUs
            sku_url = f"{self.base_url}/subscribedSkus"
            try:
                sku_response = await client.get(sku_url, headers=self.headers)
                sku_response.raise_for_status()
                skus = sku_response.json().get("value", [])
            except Exception as e:
                logger.error(f"Error fetching SKUs: {str(e)}")
                skus = []

            # Fetch usage data (requires Reports.Read.All permission)
            usage_url = (
                f"{self.base_url}/reports/getMicrosoft365AppUserDetail(period='D90')"
                "?$format=application/json"
            )
            try:
                usage_response = await client.get(usage_url, headers=self.headers)
                usage_ok = usage_response.status_code == 200
                usage_data = (
                    usage_response.json().get("value", []) if usage_ok else None
                )
            except Exception as e:
                logger.warning(f"Could not fetch usage data (may require Reports.Read.All): {str(e)}")
                usage_ok = False
                usage_data = None

            return skus, usage_data, usage_ok
