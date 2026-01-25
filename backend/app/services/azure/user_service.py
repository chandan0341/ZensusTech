"""
Azure user service for user management and role assignment operations.
"""
import httpx
from typing import Dict, List, Set

from app.core.config import settings
from app.core.exceptions import AzureAPIError
from app.core.logging_config import get_logger
from app.services.azure.graph_service import GraphService

logger = get_logger(__name__)


class UserService:
    """Service for Azure user and role assignment operations."""

    def __init__(self, graph_token: str, management_token: str):
        """
        Initialize user service with tokens.

        Args:
            graph_token: Microsoft Graph API token
            management_token: Azure Management API token
        """
        self.graph_service = GraphService(graph_token)
        self.management_token = management_token
        self.headers = {"Authorization": f"Bearer {management_token}"}

    async def _fetch_role_assignments(
        self,
        client: httpx.AsyncClient,
        subscription_id: str,
    ) -> List[Dict]:
        """
        Fetch all role assignments from Azure ARM.

        Args:
            client: HTTP client instance
            subscription_id: Azure subscription ID

        Returns:
            List of role assignment dictionaries
        """
        url = (
            f"{settings.ARM_BASE}/subscriptions/{subscription_id}"
            "/providers/Microsoft.Authorization/roleAssignments?api-version=2022-04-01"
        )

        try:
            response = await client.get(url, headers=self.headers)
            response.raise_for_status()

            data = response.json()
            assignments = data.get("value", [])
            logger.info(f"Retrieved {len(assignments)} role assignments")
            return assignments

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error fetching role assignments: {e.response.status_code}")
            raise AzureAPIError(f"Failed to fetch role assignments: HTTP {e.response.status_code}")

        except Exception as e:
            logger.error(f"Error fetching role assignments: {str(e)}", exc_info=True)
            raise AzureAPIError(f"Failed to fetch role assignments: {str(e)}")

    async def get_subscription_users(self, subscription_id: str) -> Dict:
        """
        Get users with role assignments for a subscription.

        Args:
            subscription_id: Azure subscription ID

        Returns:
            Dictionary with users, service principals count, and foreign groups count
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch role assignments
            assignments = await self._fetch_role_assignments(client, subscription_id)
            if not assignments:
                return {
                    "users": [],
                    "servicePrincipalsCount": 0,
                    "foreignGroupsCount": 0,
                }

            # Count and group assignments
            sp_count = 0
            fg_count = 0
            grouped: Dict[str, Dict] = {}

            for assignment in assignments:
                props = assignment.get("properties", {})
                principal_id = props.get("principalId")
                principal_type = props.get("principalType", "User")

                # Count service principals and foreign groups
                if principal_type == "ForeignGroup":
                    fg_count += 1
                elif principal_type == "ServicePrincipal":
                    sp_count += 1

                # Group by principal ID
                role_id = props.get("roleDefinitionId", "").split("/")[-1]
                role_name = settings.AZURE_ROLES.get(role_id, "Custom Role")

                if principal_id not in grouped:
                    grouped[principal_id] = {
                        "roles": {role_name},
                        "type": principal_type,
                    }
                else:
                    grouped[principal_id]["roles"].add(role_name)

            # Process users in batches
            user_ids = [pid for pid, data in grouped.items() if data["type"] == "User"]
            final_users = []

            # Process users in chunks of 5
            for i in range(0, len(user_ids), 5):
                chunk = user_ids[i : i + 5]
                batch_requests = []

                for pid in chunk:
                    batch_requests.append({
                        "id": f"u_{pid}",
                        "method": "GET",
                        "url": f"/users/{pid}?$select=displayName,userPrincipalName,accountEnabled",
                    })
                    batch_requests.append({
                        "id": f"m_{pid}",
                        "method": "GET",
                        "url": f"/users/{pid}/authentication/methods",
                    })

                batch_data = await self.graph_service._execute_batch_request(
                    client, batch_requests
                )

                for pid in chunk:
                    u_res = batch_data.get(f"u_{pid}", {})
                    m_res = batch_data.get(f"m_{pid}", {})

                    if u_res.get("status") != 200:
                        continue

                    u_body = u_res.get("body", {})
                    is_active = u_body.get("accountEnabled", True)

                    m_val = m_res.get("body", {}).get("value", []) if m_res.get("status") == 200 else []
                    mfa_enabled = any(
                        m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod"
                        for m in m_val
                    )

                    roles = sorted(list(grouped[pid]["roles"]))
                    risk = "Low" if mfa_enabled else "High"

                    final_users.append({
                        "user": u_body.get("displayName", "Unknown"),
                        "email": u_body.get("userPrincipalName", "N/A"),
                        "role": ", ".join(roles),
                        "mfa": "Enabled" if mfa_enabled else "Disabled",
                        "status": "Active" if is_active else "Inactive",
                        "risk": risk,
                        "principalType": grouped[pid]["type"],
                        "subscription": subscription_id,
                    })

            logger.info(
                f"Processed {len(final_users)} users for subscription {subscription_id}"
            )

            return {
                "users": final_users,
                "servicePrincipalsCount": sp_count,
                "foreignGroupsCount": fg_count,
            }

    async def get_tenant_users(self) -> List[Dict]:
        """
        Get all users from the tenant with their roles and MFA status.

        Returns:
            List of user dictionaries
        """
        try:
            all_users = await self.graph_service.get_users(
                select_fields=["id", "displayName", "userPrincipalName", "userType", "accountEnabled"]
            )

            if not all_users:
                return []

            final_report = []

            # Process users in batches of 10
            async with httpx.AsyncClient(timeout=60.0) as client:
                for i in range(0, len(all_users), 10):
                    chunk = all_users[i : i + 10]
                    batch_requests = []

                    for user in chunk:
                        uid = user["id"]
                        batch_requests.append({
                            "id": f"roles-{uid}",
                            "method": "GET",
                            "url": f"/users/{uid}/memberOf?$select=displayName",
                        })
                        batch_requests.append({
                            "id": f"mfa-{uid}",
                            "method": "GET",
                            "url": f"/users/{uid}/authentication/methods",
                        })

                    batch_map = await self.graph_service._execute_batch_request(
                        client, batch_requests
                    )

                    for user in chunk:
                        uid = user["id"]

                        # Get roles
                        member_of_data = batch_map.get(f"roles-{uid}", {}).get("value", [])
                        priv_roles_list = [
                            item.get("displayName")
                            for item in member_of_data
                            if item.get("@odata.type") == "#microsoft.graph.directoryRole"
                            and item.get("displayName") is not None
                        ]
                        roles_string = ", ".join(priv_roles_list) if priv_roles_list else "Standard User"

                        # Get MFA status
                        mfa_data = batch_map.get(f"mfa-{uid}", {}).get("value", [])
                        mfa_enabled = any(
                            m.get("@odata.type") != "#microsoft.graph.passwordAuthenticationMethod"
                            for m in mfa_data
                        )

                        account_enabled = user.get("accountEnabled", True)
                        status = "Active" if account_enabled else "Inactive"
                        mfa_text = "Enabled" if mfa_enabled else "Disabled"

                        # Calculate risk
                        risk = "Low"
                        if not mfa_enabled:
                            risk = "High" if not account_enabled else "Medium"

                        final_report.append({
                            "user": user.get("displayName") or "Unknown",
                            "email": user.get("userPrincipalName") or "N/A",
                            "status": status,
                            "mfa": mfa_text,
                            "role": roles_string,
                            "risk": risk,
                            "principalType": user.get("userType", "User"),
                        })

            logger.info(f"Successfully processed {len(final_report)} tenant users")
            return final_report

        except Exception as e:
            logger.error(f"Error processing tenant users: {str(e)}", exc_info=True)
            raise AzureAPIError(f"Failed to process tenant users: {str(e)}")
