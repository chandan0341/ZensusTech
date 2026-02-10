"""
Azure license and usage service for Microsoft 365 license management.
"""
from typing import Dict, List

from app.core.logging_config import get_logger
from app.services.azure.graph_service import GraphService

logger = get_logger(__name__)

# License pricing map (in USD per month)
PRICE_MAP = {
    "O365_BUSINESS_PREMIUM": 22.00,
    "ENTERPRISEPACK": 23.00,  # O365 E3
    "DEVELOPER_PACK": 0.00,
    "EXCHANGEONLINEPLAN1": 4.00,
}


class LicenseService:
    """Service for Microsoft 365 license operations."""

    def __init__(self, graph_token: str):
        """
        Initialize license service with Graph token.

        Args:
            graph_token: Microsoft Graph API token
        """
        self.graph_service = GraphService(graph_token)
      

    async def get_license_usage_details(self) -> Dict:
        """
        Get license usage and optimization details.

        Returns:
            Dictionary with overall score, summary items, and table data
        """
        try:
            skus = await self.graph_service.get_license_and_usage()
            
            license_list = []
            total_purchased_units = 0
            total_assigned_units = 0 # Added to track total used
            total_unused_units = 0

            for item in skus:
                sku_id = item.get("skuId")
                if sku_id != "3b555118-da6a-4418-894f-7df1e2096870":
                    continue

                sku_name = item.get("skuPartNumber", "Unknown")
                purchased = item.get("prepaidUnits", {}).get("enabled", 0)
                assigned = item.get("consumedUnits", 0)
                unused = max(0, purchased - assigned)
                
                total_purchased_units += purchased
                total_assigned_units += assigned # Track this for the 4/4 display
                total_unused_units += unused

                license_list.append({
                    "license": sku_name.replace("_", " "),
                    "purchased": purchased,
                    "assigned": assigned,
                    "unused": unused
                })

            # FIX: MOVE THIS OUTSIDE THE FOR LOOP (UN-INDENT)
            if not license_list:
                status, color, number = "N/A", "grey", "0/0"
            elif total_unused_units > 0:
                status, color = "Savings Possible", "red"
                number = f"{total_unused_units}/{total_purchased_units}"
            else:
                status, color = "Optimized", "green"
                # Use total_assigned_units to ensure it shows "4/4"
                number = f"{total_assigned_units}/{total_purchased_units}" 

            executive_summary = [{
                "area": "License Optimization",
                "status": status,
                "color": color,
                "number": number,
                "note": f"Managed {total_purchased_units} total license units."
            }]

            return {
                "overallScore": 0,
                "summaryItems": executive_summary,
                "tableData": license_list,
            }
        except Exception as e:
            logger.error(f"Error: {str(e)}")
            raise
    async def get_identity_governance_report(self) -> List[Dict]:
        """
        Get identity governance report.

        Returns:
            List of governance items
        """
        try:
            user_stats = await self.graph_service.get_identity_governance_data()
            privileged_count = await self.graph_service.get_privileged_user_count()

            if not user_stats:
                return []

            report_data = [
                {"category": "Total Users", "count": user_stats["total"]},
                {"category": "Active Users", "count": user_stats["active"]},
                {"category": "Guest Users", "count": user_stats["guests"]},
                {"category": "Inactive Users (>30 days)", "count": user_stats["inactive"]},
                {"category": "Privileged Users", "count": privileged_count},
            ]

            logger.info("Identity governance report generated")
            return report_data

        except Exception as e:
            logger.error(f"Error generating identity governance report: {str(e)}", exc_info=True)
            raise
    
    async def get_microsoft0365_secure_score(self) -> Dict:
        """
        Fetches M365 Secure Scores and Control Profiles using the Graph Batch API.
        """
        # Define the batch requests
        batch_payload = {
            "requests": [
                {
                    "id": "1",
                    "method": "GET",
                    "url": "/security/secureScores?$top=1" # Latest score
                },
                {
                    "id": "2",
                    "method": "GET",
                    "url": "/security/secureScoreControlProfiles" # Action plan
                }
            ]
        }

        # Execute the batch call through your existing graph service
        # This sends one POST to https://graph.microsoft.com/v1.0/$batch
        batch_response = await self.graph_service.post_batch(batch_payload)
        
        responses = batch_response.get("responses", [])
        
        # Extract results by the IDs defined above
        score_result = next((r["body"] for r in responses if r["id"] == "1"), {})
        profiles_result = next((r["body"] for r in responses if r["id"] == "2"), {})

        # Pass the full raw response to the UI as requested
        return {
            "success": True,
            "data": {
                "overall": score_result.get("value", [{}])[0],
                "action_plan": profiles_result.get("value", []),
                "batch_metadata": {
                    "score_status": next((r["status"] for r in responses if r["id"] == "1"), None),
                    "profiles_status": next((r["status"] for r in responses if r["id"] == "2"), None)
                }
            }
        }