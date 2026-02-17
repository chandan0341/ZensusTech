"""
Microsoft Graph API service for user and identity operations.
"""
import asyncio
import io
import httpx
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional,Any
import json

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
        self.arg_url = "https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01"
    
    # Inside graph_service.py
    async def post_batch(self, payload: dict) -> dict:
        """
        Sends a consolidated batch request to Microsoft Graph.
        """
        url = "https://graph.microsoft.com/v1.0/$batch"
        
        # Use the token that was passed during initialization
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

        # Using httpx.AsyncClient is the standard for modern FastAPI/Python apps
        async with httpx.AsyncClient() as client:
            response = await client.post(url, json=payload, headers=headers)
            
            if response.status_code != 200:
                logger.error(f"Batch API Error: {response.text}")
                raise Exception(f"Graph Batch API failed: {response.status_code}")
                
            return response.json()
    
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

    async def get_security_posture_batched(self):
        """
        Executes a single batch call to fetch both Secure Score and Control Profiles.
        """
        batch_url = f"{self.base_url}/$batch"
        
        # Define the individual requests to be batched
        batch_payload = {
            "requests": [
                {
                    "id": "1",
                    "method": "GET",
                    "url": "/security/secureScores?$top=1"
                },
                {
                    "id": "2",
                    "method": "GET",
                    "url": "/security/secureScoreControlProfiles"
                }
            ]
        }

        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.post(
                    batch_url, 
                    headers=self.headers, 
                    json=batch_payload
                )
                response.raise_for_status()
                batch_data = response.json()

                # Extract individual responses by their IDs
                responses = {res['id']: res for res in batch_data.get('responses', [])}
                
                # Handle Score Data (Request ID: 1)
                score_res = responses.get("1", {})
                if score_res.get("status") != 200:
                    return {"error": f"Score API failed: {score_res.get('status')}"}
                
                score_data = score_res.get("body", {}).get("value", [{}])[0]

                # Handle Profiles Data (Request ID: 2)
                profiles_res = responses.get("2", {})
                profiles_list = profiles_res.get("body", {}).get("value", []) if profiles_res.get("status") == 200 else []

                # Merge instructions into the score data
                profiles_map = {p['id']: p.get('remediation') for p in profiles_list}
                
                if "controlScores" in score_data:
                    for control in score_data["controlScores"]:
                        c_id = control.get("controlName")
                        control["remediation"] = profiles_map.get(c_id, "No steps found.")

                return score_data

            except Exception as e:
                logger.error(f"Batch request failed: {str(e)}")
                return {"error": str(e)}
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
            # usage_url = (
            #     f"{self.base_url}/reports/getMicrosoft365AppUserDetail(period='D90')"
            #     "?$format=application/json"
            # )
            # try:
            #     usage_response = await client.get(usage_url, headers=self.headers)
            #     usage_ok = usage_response.status_code == 200
            #     usage_data = (
            #         usage_response.json().get("value", []) if usage_ok else None
            #     )
            # except Exception as e:
            #     logger.warning(f"Could not fetch usage data (may require Reports.Read.All): {str(e)}")
            #     usage_ok = False
            #     usage_data = None

            return skus
        
    async def get_microsoft0365_secure_score(self) -> Dict[str, Any]:
            # Define the batch requests
            # Note: Reports API is called separately if it requires follow_redirects 
            # but most tenants support basic batching for metadata.
            payload = {
                "requests": [
                    {
                        "id": "1",
                        "method": "GET",
                        "url": "security/secureScores?$top=1"
                    }
                ]
            }
            logger.info("Fetching Microsoft 365 secure score details from Graph API")
            logger.info(f"Batch Request Payload: {payload}")
            logger.info(f"token: {self.access_token}")  # Log only the beginning of the token for security

            async with httpx.AsyncClient() as client:
                response = await client.post(f"{self.base_url}/$batch", headers=self.headers, json=payload)
                
                if response.status_code != 200:
                    return {"error": "Batch request failed", "details": response.text}

                batch_responses = response.json().get("responses", [])
                
                # Use a helper to safely parse each response body
                def safe_parse(resp_obj):
                    body = resp_obj.get("body", {})
                    # If body is a string (common batch issue), convert to dict
                    if isinstance(body, str):
                        try:
                            return json.loads(body)
                        except:
                            return {}
                    return body

                results = {res["id"]: safe_parse(res) for res in batch_responses}

                # Secure Score is returned as a list in the 'value' key
                score_body = results.get("1", {})
                score_value = score_body.get("value", [{}])[0] if isinstance(score_body, dict) else {}   

                return score_value
    
    async def get_applications(
        self, 
        select_fields: Optional[List[str]] = None, 
        top: int = 100
    ) -> List[Dict]:
        """
        Get all application registrations from the tenant.
        
        Uses: GET https://graph.microsoft.com/v1.0/applications
        """
        # Define the fields requested by the frontend
        default_fields = ["id", "appId", "displayName", "createdDateTime", "signInAudience"]
        select = ",".join(select_fields or default_fields)
        
        # Build URL
        url = f"{self.base_url}/applications?$select={select}&$top={top}"
        all_apps = []

        async with httpx.AsyncClient(timeout=30.0) as client:
            while url:
                try:
                    response = await client.get(url, headers=self.headers)
                    response.raise_for_status()

                    data = response.json()
                    apps_chunk = data.get("value", [])
                    all_apps.extend(apps_chunk)

                    # Handle pagination if many apps exist
                    url = data.get("@odata.nextLink")
                    if url and not url.startswith("http"):
                        url = f"{self.base_url}{url}"

                except httpx.HTTPStatusError as e:
                    logger.error(f"HTTP error fetching applications: {e.response.status_code}")
                    # We return an empty list or partial list rather than crashing the whole dashboard
                    break 

                except Exception as e:
                    logger.error(f"Error fetching applications: {str(e)}", exc_info=True)
                    break

        logger.info(f"Retrieved {len(all_apps)} applications from tenant")
        return all_apps    
    
    async def get_audit_logs(self, category: Optional[str] = None, start_date: Optional[str] = None):
        # 1. Base URL
        url = f"{self.base_url}/auditLogs/directoryAudits"
        
        # 2. Build Filters
        filters = []
        if start_date:
            filters.append(f"activityDateTime ge {start_date}")
        if category and category != "All":
            filters.append(f"category eq '{category}'")
        
        # 3. Construct Query
        params = {
            "$select": "id,activityDateTime,activityDisplayName,initiatedBy,targetResources,category",
            "$orderby": "activityDateTime desc",
            "$top": 50
        }
        
        if filters:
            params["$filter"] = " and ".join(filters)

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json().get("value", [])  
    
    async def get_organization_info(self):
        url = f"{self.base_url}/organization"
        
        # Selecting all fields present in your JSON response
        params = {
            "$select": "id,displayName,verifiedDomains,onPremisesSyncEnabled,"
                    "onPremisesLastSyncDateTime,city,state,countryLetterCode,"
                    "street,postalCode,directorySizeQuota,technicalNotificationMails,"
                    "tenantType,createdDateTime"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            
            raw_data = response.json()
            value_list = raw_data.get("value", [])
            
            if not value_list:
                return None
                
            org = value_list[0]
            
            # 1. Flatten Verified Domains (Find the default/primary one)
            domains = org.get("verifiedDomains", [])
            primary_domain = next((d["name"] for d in domains if d.get("isDefault")), None)
            if not primary_domain and domains:
                primary_domain = domains[0].get("name")

            # 2. Calculate Quota Metrics
            quota = org.get("directorySizeQuota", {})
            used = quota.get("used", 0)
            total = quota.get("total", 1) 
            usage_pct = round((used / total) * 100, 2)

            # 3. Return the comprehensive mapped object
            return {
                "tenantId": org.get("id"),
                "tenantName": org.get("displayName"),
                "domain": primary_domain,
                "isSynced": org.get("onPremisesSyncEnabled"),
                "lastSync": org.get("onPremisesLastSyncDateTime"),
                # Location details
                "city": org.get("city"),
                "state": org.get("state"),
                "country": org.get("countryLetterCode"),
                "street": org.get("street"),
                "zipCode": org.get("postalCode"),
                # Operational data
                "quota": {
                    "used": used,
                    "total": total,
                    "percent": usage_pct
                },
                "supportEmail": (org.get("technicalNotificationMails") or [None])[0],
                "tenantType": org.get("tenantType"),
                "createdOn": org.get("createdDateTime")
            }
            
    async def get_subscription_security_report(self, subscription_id: str, mgmt_token: str):
            """
            Main entry point for the 3 infrastructure cards.
            """
            query = """
            Resources
            | where subscriptionId =~ '{sub_id}'
            | where 
                (type =~ 'microsoft.network/networksecuritygroups') or 
                (type =~ 'microsoft.storage/storageaccounts') or 
                (type =~ 'microsoft.compute/disks' and properties.diskState == 'Unattached')
            | extend category = case(
                type =~ 'microsoft.network/networksecuritygroups', "network",
                type =~ 'microsoft.storage/storageaccounts', "data",
                "hygiene"
            )
            | extend finding = case(
                category == "network", "Management Ports (22/3389) Open to Internet",
                category == "data", "Public Access Enabled on Storage",
                "Orphaned Managed Disk"
            )
            | extend severity = case(
                category == "network", "CRITICAL",
                category == "data", "HIGH",
                "LOW"
            )
            | extend fix = case(
                category == "network", "Restrict NSG rules to known IP ranges.",
                category == "data", "Disable 'Allow public access' in configuration.",
                "Delete unattached disk to stop billing."
            )
            | summarize resources = make_list(name), count = count() by category, finding, severity, fix
            """.format(sub_id=subscription_id)

            return await self._run_resource_graph_query(query, subscription_id, mgmt_token)
        
    async def _run_resource_graph_query(self, query: str, subscription_id: str, mgmt_token: str):
        """
        Executes KQL against Azure Resource Graph using the MANAGEMENT token from headers.
        """
        payload = {
            "subscriptions": [subscription_id],
            "query": query,
            "options": {"resultFormat": "objectArray"}
        }
        
        # We use the mgmt_token provided by the frontend
        headers = {
            "Authorization": f"Bearer {mgmt_token}",
            "Content-Type": "application/json"
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(self.arg_url, headers=headers, json=payload, timeout=30.0)
                response.raise_for_status()
                return response.json().get("data", [])
            except httpx.HTTPStatusError as e:
                logger.error(f"Azure Graph Query Failed (Management Audience): {e.response.text}")
                return []
            except Exception as e:
                logger.error(f"Unexpected error in Graph Query: {str(e)}")
                return []        
    

    async def get_vm_security_status(self, subscription_id: str, mgmt_token: str):
        query = """
        securityresources 
        | where type == "microsoft.security/assessments"
        | extend resourceId = tostring(properties.resourceDetails.Id)
        | where resourceId contains "microsoft.compute/virtualmachines"
        | summarize 
            PatchStatus = anyif(iif(name == "5535359a-5136-4076-9d33-72a392a8323a", properties.status.code, "Unknown")),
            DefenderStatus = anyif(iif(name == "87527653-b09e-4e41-a6c3-16279930f9a2", properties.status.code, "Unknown")),
            Encryption = anyif(iif(name == "09610967-ecdc-438b-997e-ee084a929532", properties.status.code, "Unknown")),
            Risk = max(tostring(properties.metadata.severity))
            by resourceId
        | extend VMName = tostring(split(resourceId, '/')[-1])
        | project VMName, PatchStatus, DefenderStatus, Encryption, Risk
        """
        return await self._run_resource_graph_query(query, subscription_id, mgmt_token)

    async def get_infra_and_data_findings(self, subscription_id: str, mgmt_token: str):
        query = """
        securityresources
        | where type == "microsoft.security/assessments"
        | where properties.status.code == "Unhealthy"
        | extend Category = tostring(properties.metadata.categories[0])
        | extend Finding = tostring(properties.metadata.displayName)
        | extend Severity = tostring(properties.metadata.severity)
        | summarize Count = count() by Finding, Category, Severity
        | order by Severity desc
        """
        return await self._run_resource_graph_query(query, subscription_id, mgmt_token)

    # --- DIRECT MANAGEMENT API CALLS (The 5 APIs) ---

    async def _get_mgmt_data(self, url: str, mgmt_token: str):
        headers = {
            "Authorization": f"Bearer {mgmt_token}"
        }
        timeout = httpx.Timeout(30.0)  # 🔥 increase timeout to 30 seconds


        async with httpx.AsyncClient(timeout = timeout) as client:
            try:
                response = await client.get(url, headers=headers)

                logger.info("Azure API URL: %s", url)
                logger.info("Status Code: %s", response.status_code)
                logger.info("Response Body: %s", response.text)

                response.raise_for_status()

                return response.json()

            except httpx.HTTPStatusError as e:
                logger.error(
                    "Azure API failed | URL: %s | Status: %s | Response: %s",
                    url,
                    e.response.status_code,
                    e.response.text
                )
                raise

            except Exception as e:
                logger.exception("Unexpected error calling Azure API: %s", url)
                raise


    async def get_azure_secure_score(self, subscription_id: str, mgmt_token: str):
        """API 1: Get Secure Score (Current vs Max)"""
        url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/secureScores?api-version=2020-01-01"
        data = await self._get_mgmt_data(url, mgmt_token)
        # Return the object itself for raw data access
        return data

    async def get_security_assessments(self, subscription_id: str, mgmt_token: str):
        """API 2: List Security Recommendations"""
        url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/assessments?$top=10&api-version=2021-06-01"
        return await self._get_mgmt_data(url, mgmt_token)

    async def get_secure_score_controls(self, subscription_id: str, mgmt_token: str):
        """API 3: Secure Score Controls Summary"""
        url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/secureScoreControls?api-version=2020-01-01"
        return await self._get_mgmt_data(url, mgmt_token)

    async def get_regulatory_standards(self, subscription_id: str, mgmt_token: str):
        """API 4: Regulatory Compliance Standards"""
        url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/regulatoryComplianceStandards?api-version=2019-01-01"
        return await self._get_mgmt_data(url, mgmt_token)

    async def get_failed_regulatory_controls(self, subscription_id: str, mgmt_token: str):
        """API 5: Failed Controls (Microsoft Cloud Security Benchmark)"""
        url = (
            f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/"
            f"regulatoryComplianceStandards/Microsoft-cloud-security-benchmark/regulatoryComplianceControls"
            f"?$filter=properties/state eq 'Failed'&api-version=2019-01-01-preview"
        )
        return await self._get_mgmt_data(url, mgmt_token)

    # --- IDENTITY BATCH (GRAPH) ---

    async def get_identity_security_batch(self, graph_token: str,):
        batch_payload = {
            "requests": [
                {
                    "id": "1",
                    "method": "GET",
                    "url": "/reports/authenticationMethods/userRegistrationDetails?$filter=isMfaRegistered eq false&$count=true",
                    "headers": {"ConsistencyLevel": "eventual"}
                },
                {
                    "id": "2",
                    "method": "GET",
                    "url": "/directoryRoles?$expand=members"
                }
            ]
        }
        headers = {"Authorization": f"Bearer {graph_token}", "Content-Type": "application/json"}
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(f"{self.base_url}/$batch", headers=headers, json=batch_payload)
                if response.status_code != 200:
                    return {"mfaIssues": 0, "adminCount": 0}

                responses = response.json().get("responses", [])
                mfa_issues = next((r for r in responses if r["id"] == "1"), {}).get("body", {}).get("@odata.count", 0)
                role_data = next((r for r in responses if r["id"] == "2"), {}).get("body", {}).get("value", [])
                global_admins = next((r for r in role_data if r.get("displayName") == "Global Administrator"), {})
                admin_count = len(global_admins.get("members", []))

                return {
                    "mfaIssues": mfa_issues,
                    "adminCount": admin_count,
                    "status": "Critical" if mfa_issues > 0 else "Secure"
                }
            except Exception as e:
                logger.error(f"Identity Batch failed: {str(e)}")
                return {"mfaIssues": 0, "adminCount": 0}

    async def get_resource_count(self, subscription_id, mgmt_token: str):
        url = f"https://management.azure.com/subscriptions/{subscription_id}/resources?api-version=2021-04-01"
        # Implementation using your preferred async client (e.g., httpx.get)
        return await self._get_mgmt_data(url, mgmt_token)

    async def get_security_alerts(self, subscription_id, mgmt_token: str):
        url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Security/alerts?api-version=2022-01-01"
        return await self._get_mgmt_data(url, mgmt_token)
    # --- CONSOLIDATED MASTER REPORT ---

    async def get_consolidated_security_report(
        self,
        subscription_id: str,
        mgmt_token: str,
        graph_token: str
    ):
        tasks = [
            self.get_azure_secure_score(subscription_id, mgmt_token),           # 0
            self.get_security_assessments(subscription_id, mgmt_token),         # 1
            self.get_secure_score_controls(subscription_id, mgmt_token),        # 2
            self.get_regulatory_standards(subscription_id, mgmt_token),         # 3
            self.get_failed_regulatory_controls(subscription_id, mgmt_token),   # 4
            self.get_resource_count(subscription_id, mgmt_token),               # 5 (New)
            self.get_security_alerts(subscription_id, mgmt_token),
        ]

        # Allow failures but detect them
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # 🔎 Check for exceptions explicitly
        for idx, result in enumerate(results):
            if isinstance(result, Exception):
                logger.exception("Task %s failed in consolidated security report", idx)
                raise result  # Don't silently ignore

        secure_scores_raw   = results[0] or {}
        assessments_raw     = results[1] or {"value": []}
        controls_raw        = results[2] or {"value": []}
        standards_raw       = results[3] or {"value": []}
        failed_controls_raw = results[4] or {"value": []}
        resources_raw       = results[5] or {"value": []}
        alerts_raw          = results[6] or {"value": []}

        # 🔥 IMPORTANT FIX
        # Azure Secure Score API returns list under "value"
        # You must extract first item
        secure_score_obj = {}
        if isinstance(secure_scores_raw, dict):
            secure_score_obj = (
                secure_scores_raw.get("value", [{}])[0]
                if secure_scores_raw.get("value")
                else {}
            )

        return {
            "scoreData": secure_score_obj,
            "allAssessments": assessments_raw,
            "scoreControls": controls_raw,
            "complianceStandards": standards_raw,
            "failedControls": failed_controls_raw,
            "resourceInventory": resources_raw,
            "activeAlerts": alerts_raw,
            "postureKPI": {
                "currentScore": secure_score_obj.get("properties", {}).get("score", {}).get("current", 0),
                "maxScore": secure_score_obj.get("properties", {}).get("score", {}).get("max", 0),
                "percentage": secure_score_obj.get("properties", {}).get("score", {}).get("percentage", 0),
                "totalFailedControls": len(failed_controls_raw.get("value", [])),
            },
        }
