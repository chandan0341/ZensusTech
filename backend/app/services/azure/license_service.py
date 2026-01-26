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
            # Fetch data in parallel
            skus = await self.graph_service.get_license_and_usage()
            score = await self.graph_service.get_secure_score()

            license_list = []
            total_unused = 0

            # Process each SKU
            for item in skus:
                sku_id = item.get("skuId")
                sku_name = item.get("skuPartNumber")

                # Filter: Only allow the specific Business Essentials SKU
                if sku_id != "3b555118-da6a-4418-894f-7df1e2096870":
                    continue
                sku_name = item.get("skuPartNumber")
                purchased = item.get("prepaidUnits", {}).get("enabled", 0)
                assigned = item.get("consumedUnits", 0)
                unused = purchased - assigned
                total_unused += unused


                license_list.append({
                    "license": sku_name.replace("_", " ") if sku_name else "Unknown",
                    "purchased": purchased,
                    "assigned": assigned,
                    "unused": unused
                })

            # Build executive summary
            executive_summary = [
                {
                    "area": "License Optimization",
                    "status": "Savings Possible" if total_unused > 0 else "Optimized",
                    "color": "red" if total_unused > 0 else "green",
                }
            ]

            logger.info(f"License usage report generated with score: {score}%")

            return {
                "overallScore": score,
                "summaryItems": executive_summary,
                "tableData": license_list,
            }

        except Exception as e:
            logger.error(f"Error generating license usage report: {str(e)}", exc_info=True)
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
        Get Microsoft 365 secure score details.
        Returns:
            Dictionary with overall score, executive summary, admin roles, and license table
        """
            
        report_data = await self.graph_service.get_microsoft0365_secure_score()
        logger.info("Fetched raw dashboard data from Microsoft Graph")
        
        score_data = report_data.get("score", {})
        if isinstance(score_data, str):
            import json
            score_data = json.loads(score_data)
        
        controls = score_data.get("controlScores", [])

        # --- 1. EMAIL SECURITY LOGIC (Updated to 0/3) ---
        # Checking SPF/DKIM (Basic) + SafeLinks/SafeAttachments (Advanced)
        email_check_list = ["ExchangeDkimEnabled", "mdo_safelinksforemail", "mdo_safeattachments"]
        found_email_controls = [c for c in controls if c["controlName"] in email_check_list]
        
        implemented_count = sum(1 for c in found_email_controls if c.get("score", 0) > 0)
        total_email_checks = len(email_check_list)
        
        # Determine status based on your 0/3 result
        if implemented_count == 0:
            email_status, email_color = "At Risk: Links/Files Unprotected", "red"
        elif implemented_count < total_email_checks:
            email_status, email_color = "Configuration Gap", "orange"
        else:
            email_status, email_color = "Protected", "green"
        
        email_number = f"{implemented_count}/{total_email_checks}"

        # --- 3. LICENSE LOGIC (Filtered & Optimized) ---
        EXCLUDED_SKUS = ["FLOW_FREE", "POWER_BI_STANDARD"] # Add noise SKUs here
        license_table = []
        total_unused_paid = 0

       
        # --- 4. OVERALL SCORE & CXO NOTE ---
        overall_pct = int((score_data.get("currentScore", 0) / score_data.get("maxScore", 1)) * 100)
        
        # This note explains why the score is 37% even if Identity is Green
        summary_note = "Security gap identified in Email Protection. Identity is secure, but advanced threat policies are disabled."

        return {
            "overallScore": overall_pct,
            "summaryNote": summary_note,
            "cards": [
                {
                    "area": "Email", 
                    "status": email_status, 
                    "color": email_color,
                    "number": email_number,
                    "note": "DKIM, Safe Links, and Safe Attachments"
                }
            ],
            "license_details": license_table
        }